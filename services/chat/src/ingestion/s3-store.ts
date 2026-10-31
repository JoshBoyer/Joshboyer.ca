import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { types } from 'node:util';
import { EMBEDDING_DIMENSIONS, REGION } from '../config.js';
import { ServiceError } from '../errors.js';
import type { Fetch } from '../provider.js';

export const S3_SERVICE = 's3';
export const S3_VECTORS_SERVICE = 's3vectors';
export const S3_VECTORS_DEFAULT_ENDPOINT = `https://s3vectors.${REGION}.api.aws`;
export const MAX_STORAGE_OBJECT_BYTES = 2 * 1024 * 1024;
export const MAX_VECTOR_BATCH_SIZE = 64;
export const MAX_VECTOR_QUERY_TOP_K = 32;
export const MIN_VECTOR_NORM = 1e-12;

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
}

export type CredentialProvider = () => Promise<AwsCredentials>;

interface SmithyHttpRequestOptions {
  method: string;
  protocol: string;
  hostname: string;
  port?: number;
  path: string;
  headers: Record<string, string>;
  body?: string;
}

interface SignedSmithyRequest {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface SignatureV4Instance {
  sign(
    requestToSign: SmithyHttpRequestOptions,
    options?: { signingDate?: Date }
  ): Promise<SignedSmithyRequest>;
}

interface SignatureV4Constructor {
  new (options: {
    service: string;
    region: string;
    credentials: AwsCredentials | CredentialProvider;
    sha256: typeof Sha256;
    uriEscapePath?: boolean;
    applyChecksum?: boolean;
  }): SignatureV4Instance;
}

interface HttpRequestConstructor {
  new (options: SmithyHttpRequestOptions): SmithyHttpRequestOptions;
}

function resolveChatRequire(): NodeRequire {
  return createRequire(path.resolve(__dirname, '../../package.json'));
}

function loadSignatureV4(): SignatureV4Constructor {
  try {
    const mod = require('@smithy/signature-v4') as { SignatureV4: SignatureV4Constructor };
    return mod.SignatureV4;
  } catch {
    const mod = resolveChatRequire()('@smithy/signature-v4') as { SignatureV4: SignatureV4Constructor };
    return mod.SignatureV4;
  }
}

function loadHttpRequest(): HttpRequestConstructor {
  try {
    const mod = require('@smithy/core/protocols') as { HttpRequest: HttpRequestConstructor };
    return mod.HttpRequest;
  } catch {
    const mod = resolveChatRequire()('@smithy/core/protocols') as { HttpRequest: HttpRequestConstructor };
    return mod.HttpRequest;
  }
}

function loadDefaultCredentialProvider(): () => CredentialProvider {
  try {
    const mod = require('@aws-sdk/credential-provider-node') as { defaultProvider: () => CredentialProvider };
    return mod.defaultProvider;
  } catch {
    const mod = resolveChatRequire()('@aws-sdk/credential-provider-node') as { defaultProvider: () => CredentialProvider };
    return mod.defaultProvider;
  }
}

const SignatureV4 = loadSignatureV4();
const HttpRequest = loadHttpRequest();
const defaultCredentialProvider = loadDefaultCredentialProvider();

export class Sha256 {
  private readonly hash: ReturnType<typeof createHash> | ReturnType<typeof createHmac>;

  constructor(secret?: string | ArrayBuffer | ArrayBufferView) {
    if (secret !== undefined) {
      const key =
        typeof secret === 'string'
          ? secret
          : ArrayBuffer.isView(secret)
            ? Buffer.from(secret.buffer, secret.byteOffset, secret.byteLength)
            : Buffer.from(secret);
      this.hash = createHmac('sha256', key);
    } else {
      this.hash = createHash('sha256');
    }
  }

  update(data: string | ArrayBuffer | ArrayBufferView): void {
    const buf =
      typeof data === 'string'
        ? Buffer.from(data, 'utf8')
        : ArrayBuffer.isView(data)
          ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
          : Buffer.from(data);
    this.hash.update(buf);
  }

  async digest(): Promise<Uint8Array> {
    return new Uint8Array(this.hash.digest());
  }
}

export function sha256Hex(data: string | Uint8Array): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return createHash('sha256').update(buf).digest('hex');
}

export function isSafePlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, desc] of Object.entries(descriptors)) {
    if (key === '__proto__' || 'get' in desc || 'set' in desc || !desc.enumerable) {
      return false;
    }
  }
  return true;
}

export function isSafeJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return !value.includes('\u0000');
  if (Array.isArray(value)) {
    if (types.isProxy(value)) return false;
    return value.every(item => isSafeJsonValue(item, depth + 1));
  }
  if (isSafePlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k.includes('\u0000') || !isSafeJsonValue(v, depth + 1)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function computeVectorNorm(vector: readonly number[]): number {
  if (!Array.isArray(vector) || types.isProxy(vector) || vector.length === 0) {
    return 0;
  }
  let sumSq = 0;
  for (const component of vector) {
    if (typeof component !== 'number' || !Number.isFinite(component)) {
      return 0;
    }
    sumSq += component * component;
  }
  const norm = Math.sqrt(sumSq);
  return Number.isFinite(norm) && norm > MIN_VECTOR_NORM ? norm : 0;
}

export function validateEmbeddingVector(
  vector: unknown,
  expectedDimensions = EMBEDDING_DIMENSIONS,
  errorCode = 'VECTOR_VALIDATION_FAILED'
): number[] {
  if (
    !Array.isArray(vector) ||
    types.isProxy(vector) ||
    vector.length !== expectedDimensions
  ) {
    throw new ServiceError(errorCode, 400);
  }
  const out: number[] = [];
  let sumSq = 0;
  for (const item of vector) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      throw new ServiceError(errorCode, 400);
    }
    out.push(item);
    sumSq += item * item;
  }
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm <= MIN_VECTOR_NORM) {
    throw new ServiceError(errorCode, 400);
  }
  return out;
}

const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const VECTOR_BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const VECTOR_INDEX_PATTERN = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;
const OBJECT_KEY_PATTERN = /^[A-Za-z0-9/_.:-]{1,512}$/;
const VECTOR_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;

export function validateS3BucketName(bucket: unknown): string {
  if (
    typeof bucket !== 'string' ||
    !S3_BUCKET_PATTERN.test(bucket) ||
    bucket.includes('..') ||
    /[\u0000\r\n\u2028\u2029]/.test(bucket)
  ) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  return bucket;
}

export function validateS3ObjectKey(key: unknown): string {
  if (
    typeof key !== 'string' ||
    !OBJECT_KEY_PATTERN.test(key) ||
    key.startsWith('/') ||
    key.endsWith('/') ||
    key.includes('//') ||
    /[\u0000\r\n\u2028\u2029]/.test(key)
  ) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  const segments = key.split('/');
  if (segments.some(seg => seg.length === 0 || seg === '.' || seg === '..')) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  return key;
}

export function validateVectorBucketName(name: unknown): string {
  if (
    typeof name !== 'string' ||
    !VECTOR_BUCKET_PATTERN.test(name) ||
    name.includes('..') ||
    /[\u0000\r\n\u2028\u2029]/.test(name)
  ) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  return name;
}

export function validateVectorIndexName(name: unknown): string {
  if (
    typeof name !== 'string' ||
    !VECTOR_INDEX_PATTERN.test(name) ||
    name.includes('..') ||
    /[\u0000\r\n\u2028\u2029]/.test(name)
  ) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  return name;
}

export function validateVectorKey(key: unknown): string {
  if (typeof key !== 'string' || !VECTOR_KEY_PATTERN.test(key)) {
    throw new ServiceError('INVALID_STORAGE_TARGET', 400);
  }
  return key;
}

function validateLoopbackOrRegionalEndpoint(
  endpoint: string,
  allowedProdHostPattern: RegExp,
  allowLoopbackForTests = false
): URL {
  if (
    typeof endpoint !== 'string' ||
    endpoint.length === 0 ||
    endpoint.length > 512 ||
    /[\u0000\r\n\\%?]/.test(endpoint) ||
    endpoint.includes('..')
  ) {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
  }
  if (parsed.protocol === 'https:') {
    if (parsed.port !== '' || !allowedProdHostPattern.test(parsed.hostname)) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    return parsed;
  }
  if (allowLoopbackForTests && parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') {
    const portNum = Number(parsed.port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    return parsed;
  }
  throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
}

async function readBoundedBytes(response: Response, signal: AbortSignal, maxBytes = MAX_STORAGE_OBJECT_BYTES): Promise<Uint8Array> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
  }
  if (!response.body) {
    return new Uint8Array(0);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maxBytes) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      chunks.push(item.value);
    }
    signal.throwIfAborted();
    return Buffer.concat(chunks);
  } finally {
    signal.removeEventListener('abort', onAbort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export interface AwsStoreOptions {
  region?: string;
  endpoint?: string;
  allowLoopbackForTests?: boolean;
  credentials?: AwsCredentials | CredentialProvider;
  fetchImpl?: Fetch;
  now?: () => number;
  timeoutMs?: number;
}

export class S3ObjectStore {
  private readonly region: string;
  private readonly customEndpoint: URL | undefined;
  private readonly allowLoopbackForTests: boolean;
  private readonly signer: SignatureV4Instance;
  private readonly fetchImpl: Fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(options: AwsStoreOptions = {}) {
    const rawOpts: unknown = options;
    if (!isSafePlainObject(rawOpts)) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    const region = options.region ?? REGION;
    if (region !== REGION) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    this.region = region;
    this.allowLoopbackForTests = options.allowLoopbackForTests === true;
    if (options.endpoint !== undefined) {
      this.customEndpoint = validateLoopbackOrRegionalEndpoint(
        options.endpoint,
        /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\.s3\.us-east-2\.amazonaws\.com$/,
        this.allowLoopbackForTests
      );
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    const credentials = options.credentials ?? defaultCredentialProvider();
    this.signer = new SignatureV4({
      service: S3_SERVICE,
      region: this.region,
      credentials,
      sha256: Sha256,
      uriEscapePath: false,
      applyChecksum: false
    });
  }

  private resolveTarget(bucket: string, key: string): { url: URL; signPath: string } {
    const validBucket = validateS3BucketName(bucket);
    const validKey = validateS3ObjectKey(key);
    const encodedKey = validKey.split('/').map(seg => encodeURIComponent(seg)).join('/');
    if (this.customEndpoint) {
      if (this.customEndpoint.protocol === 'http:' && this.customEndpoint.hostname === '127.0.0.1') {
        const signPath = `/${encodeURIComponent(validBucket)}/${encodedKey}`;
        return {
          url: new URL(signPath, this.customEndpoint),
          signPath
        };
      }
      const signPath = `/${encodedKey}`;
      return {
        url: new URL(signPath, this.customEndpoint),
        signPath
      };
    }
    const signPath = `/${encodedKey}`;
    return {
      url: new URL(`https://${validBucket}.s3.${this.region}.amazonaws.com${signPath}`),
      signPath
    };
  }

  async putJsonObject(
    bucket: string,
    key: string,
    value: unknown,
    signal?: AbortSignal
  ): Promise<{ sha256: string; bytes: number }> {
    if (!isSafeJsonValue(value)) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
    }
    const { url, signPath } = this.resolveTarget(bucket, key);
    const bodyText = `${JSON.stringify(value, null, 2)}\n`;
    const bodyBytes = Buffer.from(bodyText, 'utf8');
    if (bodyBytes.byteLength > MAX_STORAGE_OBJECT_BYTES) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 413);
    }
    const payloadHash = sha256Hex(bodyBytes);
    const requestToSign = new HttpRequest({
      method: 'PUT',
      protocol: url.protocol,
      hostname: url.hostname,
      ...(url.port ? { port: Number(url.port) } : {}),
      path: signPath,
      headers: {
        host: url.host,
        'content-type': 'application/json',
        'x-amz-content-sha256': payloadHash
      },
      body: bodyText
    });

    let signed: SignedSmithyRequest;
    try {
      signed = await this.signer.sign(requestToSign, { signingDate: new Date(this.now()) });
    } catch {
      throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
    }

    const effectiveSignal = signal ?? AbortSignal.timeout(this.timeoutMs);
    effectiveSignal.throwIfAborted();
    try {
      const response = await this.fetchImpl(url.toString(), {
        method: 'PUT',
        headers: signed.headers,
        body: bodyText,
        redirect: 'error',
        signal: effectiveSignal
      });
      await readBoundedBytes(response, effectiveSignal, 65_536);
      if (response.status === 401 || response.status === 403) {
        throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
      }
      if (!response.ok) {
        throw new ServiceError('STORAGE_UNAVAILABLE', 503);
      }
      return { sha256: payloadHash, bytes: bodyBytes.byteLength };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(effectiveSignal.aborted ? 'STORAGE_DEADLINE' : 'STORAGE_UNAVAILABLE', 503);
    }
  }

  async getJsonObject<T = unknown>(
    bucket: string,
    key: string,
    signal?: AbortSignal
  ): Promise<T | undefined> {
    const { url, signPath } = this.resolveTarget(bucket, key);
    const emptyHash = sha256Hex('');
    const requestToSign = new HttpRequest({
      method: 'GET',
      protocol: url.protocol,
      hostname: url.hostname,
      ...(url.port ? { port: Number(url.port) } : {}),
      path: signPath,
      headers: {
        host: url.host,
        'x-amz-content-sha256': emptyHash
      }
    });

    let signed: SignedSmithyRequest;
    try {
      signed = await this.signer.sign(requestToSign, { signingDate: new Date(this.now()) });
    } catch {
      throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
    }

    const effectiveSignal = signal ?? AbortSignal.timeout(this.timeoutMs);
    effectiveSignal.throwIfAborted();
    try {
      const response = await this.fetchImpl(url.toString(), {
        method: 'GET',
        headers: signed.headers,
        redirect: 'error',
        signal: effectiveSignal
      });
      const bytes = await readBoundedBytes(response, effectiveSignal, MAX_STORAGE_OBJECT_BYTES);
      if (response.status === 404) {
        return undefined;
      }
      if (response.status === 401 || response.status === 403) {
        throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
      }
      if (!response.ok) {
        throw new ServiceError('STORAGE_UNAVAILABLE', 503);
      }
      let parsed: unknown;
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      if (!isSafeJsonValue(parsed)) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      return parsed as T;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(effectiveSignal.aborted ? 'STORAGE_DEADLINE' : 'STORAGE_UNAVAILABLE', 503);
    }
  }
}

export interface EnsureVectorIndexInput {
  vectorBucketName: string;
  indexName: string;
  dimension?: number;
  distanceMetric?: 'cosine';
}

export interface VectorWriteItem {
  key: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface PutVectorsInput {
  vectorBucketName: string;
  indexName: string;
  vectors: ReadonlyArray<VectorWriteItem>;
}

export interface GetVectorsInput {
  vectorBucketName: string;
  indexName: string;
  keys: readonly string[];
  returnData?: boolean;
  returnMetadata?: boolean;
}

export interface StoredVectorRecord {
  key: string;
  data?: { float32: number[] };
  metadata?: Record<string, unknown>;
}

export interface QueryVectorsInput {
  vectorBucketName: string;
  indexName: string;
  queryVector: readonly number[];
  topK: number;
  filter?: Record<string, unknown>;
}

export interface QueriedVector {
  key: string;
  distance: number;
  metadata: Record<string, unknown>;
}

function isAwsNotFoundError(status: number, body: unknown): boolean {
  if (status === 404) return true;
  if (!isSafePlainObject(body)) return false;
  const code = String(body.__type ?? body.code ?? body.name ?? '');
  return code.includes('NotFoundException') || code.includes('ResourceNotFoundException');
}

export class S3VectorsStore {
  private readonly region: string;
  private readonly baseUrl: URL;
  private readonly signer: SignatureV4Instance;
  private readonly fetchImpl: Fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;

  constructor(options: AwsStoreOptions = {}) {
    const rawOpts: unknown = options;
    if (!isSafePlainObject(rawOpts)) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    const region = options.region ?? REGION;
    if (region !== REGION) {
      throw new ServiceError('CONFIGURATION_UNAVAILABLE', 503);
    }
    this.region = region;
    this.baseUrl = validateLoopbackOrRegionalEndpoint(
      options.endpoint ?? S3_VECTORS_DEFAULT_ENDPOINT,
      /^s3vectors\.us-east-2\.api\.aws$/,
      options.allowLoopbackForTests === true
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    const credentials = options.credentials ?? defaultCredentialProvider();
    this.signer = new SignatureV4({
      service: S3_VECTORS_SERVICE,
      region: this.region,
      credentials,
      sha256: Sha256,
      uriEscapePath: true,
      applyChecksum: false
    });
  }

  private async postJson(
    operationPath: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const url = new URL(operationPath, this.baseUrl);
    const bodyText = JSON.stringify(payload);
    const bodyBytes = Buffer.from(bodyText, 'utf8');
    if (bodyBytes.byteLength > MAX_STORAGE_OBJECT_BYTES) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 413);
    }
    const payloadHash = sha256Hex(bodyBytes);
    const requestToSign = new HttpRequest({
      method: 'POST',
      protocol: url.protocol,
      hostname: url.hostname,
      ...(url.port ? { port: Number(url.port) } : {}),
      path: url.pathname,
      headers: {
        host: url.host,
        'content-type': 'application/json',
        'x-amz-content-sha256': payloadHash
      },
      body: bodyText
    });

    let signed: SignedSmithyRequest;
    try {
      signed = await this.signer.sign(requestToSign, { signingDate: new Date(this.now()) });
    } catch {
      throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
    }

    const effectiveSignal = signal ?? AbortSignal.timeout(this.timeoutMs);
    effectiveSignal.throwIfAborted();
    try {
      const response = await this.fetchImpl(url.toString(), {
        method: 'POST',
        headers: signed.headers,
        body: bodyText,
        redirect: 'error',
        signal: effectiveSignal
      });
      const bytes = await readBoundedBytes(response, effectiveSignal, MAX_STORAGE_OBJECT_BYTES);
      if (response.status === 401 || response.status === 403) {
        throw new ServiceError('STORAGE_UNAUTHORIZED', 503);
      }
      let parsed: unknown = {};
      if (bytes.byteLength > 0) {
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          parsed = JSON.parse(text) as unknown;
        } catch {
          throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
        }
      }
      if (!isSafePlainObject(parsed)) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      return { status: response.status, body: parsed };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(effectiveSignal.aborted ? 'STORAGE_DEADLINE' : 'STORAGE_UNAVAILABLE', 503);
    }
  }

  async ensureVectorIndex(
    input: EnsureVectorIndexInput,
    signal?: AbortSignal
  ): Promise<{ bucketCreated: boolean; indexCreated: boolean }> {
    if (!isSafePlainObject(input)) {
      throw new ServiceError('INVALID_STORAGE_TARGET', 400);
    }
    const vectorBucketName = validateVectorBucketName(input.vectorBucketName);
    const indexName = validateVectorIndexName(input.indexName);
    const dimension = input.dimension ?? EMBEDDING_DIMENSIONS;
    const distanceMetric = input.distanceMetric ?? 'cosine';
    if (dimension !== EMBEDDING_DIMENSIONS || distanceMetric !== 'cosine') {
      throw new ServiceError('INDEX_CONFIGURATION_MISMATCH', 409);
    }

    let bucketCreated = false;
    const bucketRes = await this.postJson('/GetVectorBucket', { vectorBucketName }, signal);
    if (isAwsNotFoundError(bucketRes.status, bucketRes.body)) {
      const createBucketRes = await this.postJson('/CreateVectorBucket', { vectorBucketName }, signal);
      if (createBucketRes.status !== 200 && createBucketRes.status !== 409) {
        throw new ServiceError('STORAGE_UNAVAILABLE', 503);
      }
      bucketCreated = createBucketRes.status === 200;
    } else if (bucketRes.status !== 200) {
      throw new ServiceError('STORAGE_UNAVAILABLE', 503);
    }

    let indexCreated = false;
    const indexRes = await this.postJson('/GetIndex', { vectorBucketName, indexName }, signal);
    if (isAwsNotFoundError(indexRes.status, indexRes.body)) {
      const createIndexRes = await this.postJson(
        '/CreateIndex',
        {
          vectorBucketName,
          indexName,
          dataType: 'float32',
          dimension: EMBEDDING_DIMENSIONS,
          distanceMetric: 'cosine'
        },
        signal
      );
      if (createIndexRes.status !== 200) {
        throw new ServiceError('STORAGE_UNAVAILABLE', 503);
      }
      indexCreated = true;
    } else if (indexRes.status === 200) {
      const existing = isSafePlainObject(indexRes.body.index) ? indexRes.body.index : indexRes.body;
      const existingDim = existing.dimension;
      const existingDataType = existing.dataType;
      const existingMetric = existing.distanceMetric;
      if (
        existingDim !== EMBEDDING_DIMENSIONS ||
        existingDataType !== 'float32' ||
        (existingMetric !== undefined && existingMetric !== 'cosine')
      ) {
        throw new ServiceError('INDEX_CONFIGURATION_MISMATCH', 409);
      }
    } else {
      throw new ServiceError('STORAGE_UNAVAILABLE', 503);
    }

    return { bucketCreated, indexCreated };
  }

  async putVectors(input: PutVectorsInput, signal?: AbortSignal): Promise<{ count: number }> {
    if (
      !isSafePlainObject(input) ||
      !Array.isArray(input.vectors) ||
      types.isProxy(input.vectors) ||
      input.vectors.length < 1 ||
      input.vectors.length > MAX_VECTOR_BATCH_SIZE
    ) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
    }
    const vectorBucketName = validateVectorBucketName(input.vectorBucketName);
    const indexName = validateVectorIndexName(input.indexName);

    const seenKeys = new Set<string>();
    const formatted = input.vectors.map(item => {
      if (!isSafePlainObject(item) || !isSafePlainObject(item.metadata) || !isSafeJsonValue(item.metadata)) {
        throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
      }
      const key = validateVectorKey(item.key);
      if (seenKeys.has(key)) {
        throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
      }
      seenKeys.add(key);
      const float32 = validateEmbeddingVector(item.vector, EMBEDDING_DIMENSIONS, 'VECTOR_VALIDATION_FAILED');
      return {
        key,
        data: { float32 },
        metadata: { ...item.metadata }
      };
    });

    const response = await this.postJson(
      '/PutVectors',
      {
        vectorBucketName,
        indexName,
        vectors: formatted
      },
      signal
    );
    if (response.status !== 200) {
      throw new ServiceError('STORAGE_UNAVAILABLE', 503);
    }
    return { count: formatted.length };
  }

  async getVectors(input: GetVectorsInput, signal?: AbortSignal): Promise<StoredVectorRecord[]> {
    if (
      !isSafePlainObject(input) ||
      !Array.isArray(input.keys) ||
      types.isProxy(input.keys) ||
      input.keys.length < 1 ||
      input.keys.length > MAX_VECTOR_BATCH_SIZE
    ) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
    }
    const vectorBucketName = validateVectorBucketName(input.vectorBucketName);
    const indexName = validateVectorIndexName(input.indexName);
    const keys = input.keys.map(k => validateVectorKey(k));
    const returnData = input.returnData ?? true;
    const returnMetadata = input.returnMetadata ?? true;

    const response = await this.postJson(
      '/GetVectors',
      {
        vectorBucketName,
        indexName,
        keys,
        returnData,
        returnMetadata
      },
      signal
    );
    if (response.status !== 200 || !Array.isArray(response.body.vectors)) {
      throw new ServiceError('STORAGE_UNAVAILABLE', 503);
    }

    const results: StoredVectorRecord[] = [];
    for (const raw of response.body.vectors) {
      if (!isSafePlainObject(raw)) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      const key = validateVectorKey(raw.key);
      const record: StoredVectorRecord = { key };
      if (raw.data !== undefined) {
        if (!isSafePlainObject(raw.data)) {
          throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
        }
        record.data = {
          float32: validateEmbeddingVector(raw.data.float32, EMBEDDING_DIMENSIONS, 'STORAGE_RESPONSE_INVALID')
        };
      }
      if (raw.metadata !== undefined) {
        if (!isSafePlainObject(raw.metadata) || !isSafeJsonValue(raw.metadata)) {
          throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
        }
        record.metadata = { ...raw.metadata };
      }
      results.push(record);
    }
    return results;
  }

  async queryVectors(input: QueryVectorsInput, signal?: AbortSignal): Promise<QueriedVector[]> {
    if (
      !isSafePlainObject(input) ||
      typeof input.topK !== 'number' ||
      !Number.isSafeInteger(input.topK) ||
      input.topK < 1 ||
      input.topK > MAX_VECTOR_QUERY_TOP_K
    ) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
    }
    const vectorBucketName = validateVectorBucketName(input.vectorBucketName);
    const indexName = validateVectorIndexName(input.indexName);
    const queryVector = validateEmbeddingVector(input.queryVector, EMBEDDING_DIMENSIONS, 'VECTOR_VALIDATION_FAILED');
    if (input.filter !== undefined && (!isSafePlainObject(input.filter) || !isSafeJsonValue(input.filter))) {
      throw new ServiceError('INVALID_STORAGE_PAYLOAD', 400);
    }

    const response = await this.postJson(
      '/QueryVectors',
      {
        vectorBucketName,
        indexName,
        topK: input.topK,
        queryVector: { float32: queryVector },
        ...(input.filter !== undefined ? { filter: input.filter } : {}),
        returnMetadata: true,
        returnDistance: true
      },
      signal
    );
    if (response.status !== 200 || !Array.isArray(response.body.vectors)) {
      throw new ServiceError('STORAGE_UNAVAILABLE', 503);
    }

    const matches: QueriedVector[] = [];
    for (const raw of response.body.vectors) {
      if (
        !isSafePlainObject(raw) ||
        typeof raw.distance !== 'number' ||
        !Number.isFinite(raw.distance) ||
        raw.distance < 0
      ) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      const key = validateVectorKey(raw.key);
      const metadata =
        raw.metadata === undefined
          ? {}
          : isSafePlainObject(raw.metadata) && isSafeJsonValue(raw.metadata)
            ? { ...raw.metadata }
            : undefined;
      if (!metadata) {
        throw new ServiceError('STORAGE_RESPONSE_INVALID', 502);
      }
      matches.push({
        key,
        distance: raw.distance,
        metadata
      });
    }

    matches.sort((a, b) => (a.distance !== b.distance ? a.distance - b.distance : a.key.localeCompare(b.key)));
    return matches.slice(0, input.topK);
  }
}

export function verifyAwsSigV4Request(
  request: {
    method: string;
    path: string;
    headers: Record<string, string | undefined>;
    bodyBytes: Uint8Array;
  },
  credentials?: AwsCredentials,
  options?: {
    expectedService?: string;
    expectedRegion?: string;
    now?: () => number;
    maxClockSkewMs?: number;
  }
): {
  valid: boolean;
  accessKeyId?: string;
  region?: string;
  service?: string;
  payloadHash?: string;
} {
  const auth = request.headers.authorization;
  const amzDate = request.headers['x-amz-date'];
  const contentSha256 = request.headers['x-amz-content-sha256'];
  if (!auth || !amzDate || !contentSha256) {
    return { valid: false };
  }

  const match =
    /^AWS4-HMAC-SHA256 Credential=([A-Za-z0-9]+)\/(\d{8})\/([a-z0-9-]+)\/([a-z0-9-]+)\/aws4_request,\s*SignedHeaders=([a-z0-9;-]+),\s*Signature=([0-9a-f]{64})$/.exec(
      auth.trim()
    );
  if (!match) return { valid: false };

  const [, accessKeyId, dateStamp, region, service, signedHeadersRaw, signatureHex] = match;
  if (!accessKeyId || !dateStamp || !region || !service || !signedHeadersRaw || !signatureHex) {
    return { valid: false };
  }
  const expectedRegion = options?.expectedRegion ?? REGION;
  if (region !== expectedRegion) {
    return { valid: false, accessKeyId, region, service };
  }
  if (options?.expectedService && service !== options.expectedService) {
    return { valid: false, accessKeyId, region, service };
  }
  if (!/^\d{8}T\d{6}Z$/.test(amzDate) || !amzDate.startsWith(dateStamp)) {
    return { valid: false, accessKeyId, region, service };
  }

  if (options?.now) {
    const iso = `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`;
    const parsedTime = Date.parse(iso);
    const maxSkew = options.maxClockSkewMs ?? 300_000;
    if (!Number.isFinite(parsedTime) || Math.abs(options.now() - parsedTime) > maxSkew) {
      return { valid: false, accessKeyId, region, service };
    }
  }

  if (!/^[0-9a-f]{64}$/.test(contentSha256)) {
    return { valid: false, accessKeyId, region, service };
  }
  const computedPayloadHash = sha256Hex(request.bodyBytes);
  const providedHashBuf = Buffer.from(contentSha256, 'hex');
  const computedHashBuf = Buffer.from(computedPayloadHash, 'hex');
  if (providedHashBuf.length !== computedHashBuf.length || !timingSafeEqual(providedHashBuf, computedHashBuf)) {
    return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
  }

  const signedHeaders = signedHeadersRaw.split(';');
  const sortedUnique = [...new Set(signedHeaders)].sort();
  if (
    signedHeaders.length !== sortedUnique.length ||
    signedHeaders.some((h, idx) => h !== sortedUnique[idx]) ||
    !signedHeaders.includes('host') ||
    !signedHeaders.includes('x-amz-content-sha256') ||
    !signedHeaders.includes('x-amz-date')
  ) {
    return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
  }

  if (credentials) {
    if (accessKeyId !== credentials.accessKeyId) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }
    if (credentials.sessionToken) {
      if (
        !signedHeaders.includes('x-amz-security-token') ||
        request.headers['x-amz-security-token'] !== credentials.sessionToken
      ) {
        return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
      }
    }

    const canonicalHeaders = signedHeaders
      .map(headerName => {
        const val = request.headers[headerName];
        if (typeof val !== 'string') return null;
        return `${headerName}:${val.trim().replace(/\s+/g, ' ')}\n`;
      })
      .join('');
    if (canonicalHeaders.split('\n').length - 1 !== signedHeaders.length) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }

    const canonicalRequest = [
      request.method.toUpperCase(),
      request.path,
      '',
      canonicalHeaders,
      signedHeadersRaw,
      computedPayloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest)
    ].join('\n');

    const kDate = createHmac('sha256', `AWS4${credentials.secretAccessKey}`).update(dateStamp, 'utf8').digest();
    const kRegion = createHmac('sha256', kDate).update(region, 'utf8').digest();
    const kService = createHmac('sha256', kRegion).update(service, 'utf8').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
    const expectedSignatureHex = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    const sigBufA = Buffer.from(signatureHex, 'hex');
    const sigBufB = Buffer.from(expectedSignatureHex, 'hex');
    if (sigBufA.length !== sigBufB.length || !timingSafeEqual(sigBufA, sigBufB)) {
      return { valid: false, accessKeyId, region, service, payloadHash: computedPayloadHash };
    }
  }

  return {
    valid: true,
    accessKeyId,
    region,
    service,
    payloadHash: computedPayloadHash
  };
}
