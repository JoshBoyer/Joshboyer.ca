(function () {
  'use strict';
  const bottom = document.querySelector('#home-connect .home-bottom-bar');
  if (!bottom || document.getElementById('footer-explorer')) return;
  const section = document.createElement('section');
  section.id = 'footer-explorer';
  section.className = 'footer-explorer';
  section.setAttribute('aria-labelledby', 'footer-explorer-title');
  section.innerHTML = `
    <div class="footer-explorer-intro">
      <p class="footer-explorer-kicker">CAREER EXPLORER · LOCAL PROTOTYPE</p>
      <h2 id="footer-explorer-title">Choose a path. Ask a question.</h2>
      <p>Explore matches from Josh’s reviewed career evidence. This is a local guide, not a live AI conversation.</p>
      <div class="footer-explorer-actions"><a href="resume.html">Open résumé builder</a><a href="mailto:josh@joshboyer.ca">Email Josh</a></div>
      <p class="footer-explorer-status">Voice and live AI are unavailable in this local preview.</p>
    </div>
    <div class="footer-explorer-console">
      <p class="footer-explorer-label">Choose a starting point</p>
      <div class="footer-explorer-choices" aria-label="Career topics">
        <button type="button" data-footer-topic="NEXUS AI orchestration">01 · AI orchestration</button>
        <button type="button" data-footer-topic="system integration">02 · Integrations</button>
        <button type="button" data-footer-topic="infrastructure">03 · Infrastructure</button>
      </div>
      <p class="footer-explorer-progress" aria-live="polite">Paths explored: 0 of 3</p>
      <form data-footer-question-form>
        <label for="footer-question">Ask about Josh’s work</label>
        <div class="footer-explorer-input"><input id="footer-question" name="question" maxlength="1000" placeholder="For example: How does NEXUS use context?" required><button type="submit">Explore</button></div>
      </form>
      <button type="button" data-footer-clear>Clear guide</button>
      <div class="footer-explorer-results" aria-live="polite" aria-atomic="true"><p>Choose a topic or enter a question to begin.</p></div>
    </div>`;
  bottom.before(section);
  const form = section.querySelector('[data-footer-question-form]');
  const input = section.querySelector('#footer-question');
  const result = section.querySelector('.footer-explorer-results');
  const progress = section.querySelector('.footer-explorer-progress');
  const explored = new Set();
  let sessionPromise;
  function loadScript(src, name) {
    if (window[name]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('The local guide could not load.'));
      document.head.append(script);
    });
  }
  async function getSession() {
    if (!sessionPromise) sessionPromise = (async () => {
      await loadScript('resume-engine.js', 'ResumeEngine');
      await loadScript('career-guide-engine.js', 'CareerGuide');
      const response = await fetch('career-evidence.v3.json');
      if (!response.ok) throw new Error('Career evidence is unavailable in this preview.');
      const data = await response.json();
      return {data, session: window.CareerGuide.createSession(data)};
    })().catch(error => { sessionPromise = null; throw error; });
    return sessionPromise;
  }
  async function explore(question) {
    result.textContent = 'Searching the local career evidence…';
    try {
      const {data, session} = await getSession();
      const answer = session.send({action:'explore_evidence', question, posting:'', profile:'auto', datasetVersion:data.datasetVersion});
      result.replaceChildren();
      const heading = document.createElement('strong'); heading.textContent = answer.heading; result.append(heading);
      const intro = document.createElement('p'); intro.textContent = answer.intro; result.append(intro);
      for (const chunk of answer.chunks) {
        const item = document.createElement('p');
        const title = document.createElement('strong'); title.textContent = chunk.title + ': ';
        item.append(title, document.createTextNode(chunk.text)); result.append(item);
      }
    } catch (error) { result.textContent = error.message || 'The local guide is unavailable.'; }
  }
  section.addEventListener('click', event => {
    if (event.target.closest('[data-footer-clear]')) {
      if (sessionPromise) sessionPromise.then(({session}) => session.clear()).catch(() => {});
      input.value = '';
      explored.clear(); progress.textContent = 'Paths explored: 0 of 3';
      result.textContent = 'Choose a topic or enter a question to begin.';
      input.focus();
      return;
    }
    const button = event.target.closest('[data-footer-topic]');
    if (!button) return;
    input.value = button.dataset.footerTopic;
    explored.add(input.value); progress.textContent = `Paths explored: ${explored.size} of 3`;
    explore(input.value);
  });
  form.addEventListener('submit', event => { event.preventDefault(); explore(input.value.trim()); });
})();
