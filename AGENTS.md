# Project instructions — JoshBoyer.ca

Version: 1.0 | Updated: 2026-10-18

## Start here

Use `dist/career-evidence.v3.json` for publishable career evidence. If the private local `JOSH-BOYER-PORTFOLIO-CORPUS.md` exists, consult it before changing career content and preserve its source distinctions. Private corpus and `knowledge/` inputs are intentionally excluded from public Git and web assets; they are not required to build or test the public site.

## Existing project

This project uses static HTML, CSS and JavaScript. The web root is `dist/`. `serve.cjs` serves only that directory. `knowledge/` contains local research and conversation archives; it must remain outside the web root.

Commands: `npm start`, `npm test`, `npm run check`.

## Career accuracy

- Prefer latest explicit firsthand corrections and the current source-backed evidence over older portfolio prose.
- Historical responsibilities do not create a formal Architect job title.
- Dell starts September 2006. Grenville tenure is 2009–2022; its formal analyst transition is unresolved between 2014 and 2016.
- Corrected renewal automation: approximately 80% residential and 40% farm/agri; Josh reconfirmed commercial renewal automation at 60% on October 30, 2026 (superseding the earlier reconfirmation caveat). All are user-reported and renewal-only.
- Medavie provider integration includes solution review, mapping and synchronization requirements, followed by support of implemented/live integrations by Josh’s account. Its scheduled event table and REST consumer do not establish Kafka or real-time broker implementation.
- Takeover tooling is production/team-adopted. Josh researched and documented the solution, guided receiving-system changes with developers, and personally designed and built the production Excel VBA add-in for validation, XML batches and error reconciliation.
- Reporting continuity has approved analysis/design and operational interim SQL; the permanent compatibility extract is not confirmed live. Corrected financial-report SQL was adopted by the payment team in its existing pipeline. Modernization remains proposed.
- NEXUS is the current independent capstone. LOWKEY and Workshop42 remain historical/personal evidence.
- Older raw questionnaire answers are preserved as attributed historical evidence, including details omitted from the public website. Do not silently promote them into current public claims.

Optional private local public-copy reconciliation: when available, `knowledge/career/PORTFOLIO-CONTENT-REVIEW-2026-10-28.md` records the confirmed version-12 master and October 26 corrections. It supersedes conflicting version-1.0 shorthand for the public summaries; retain the older source recoverably.

Update the corpus and its source references when Josh supplies new facts. Keep original evidence and recorded corrections recoverable.

<!-- BEGIN AWS Agent Toolkit rules -->
## AWS Agent Toolkit project configuration

Selected Region: `us-east-2`
CLI profile: `joshboyer-portfolio`
AWS experience: new AWS experience
help_level: `MEDIUM` (chosen by Josh on 2026-10-31; do not ask again unless changed)

Toolkit configuration and catalogue commands use `us-east-1` as required by the toolkit service. Application resources remain in `us-east-2`. The public portfolio assistant must never receive this administrative MCP connection.

Source: https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-starter-rules.md

# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->
