/* A real narrow viewport keeps every existing mobile breakpoint consistent. */
(() => {
  let embedded = false;
  try { embedded = window.frameElement?.id === 'invitationPhoneFrame'; } catch {}
  const needsPhoneView = !embedded && (
    window.innerWidth > 780 ||
    (window.innerWidth >= 600 && matchMedia('(hover: hover) and (pointer: fine)').matches)
  );
  if (needsPhoneView) document.documentElement.classList.add('phone-view-shell');

  async function startInvitation() {
    for (const source of document.querySelectorAll('script[data-invitation-src]')) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = source.dataset.invitationSrc;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Unable to load invitation'));
        document.body.appendChild(script);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!needsPhoneView) {
      startInvitation().catch(error => {
        console.error(error);
        const status = document.getElementById('uploadStatus');
        if (status) status.textContent = 'Please refresh to finish loading your invitation.';
      });
      return;
    }

    const shell = document.createElement('div');
    shell.className = 'phone-view-host';
    shell.innerHTML = `
      <section class="phone-view-prompt" aria-labelledby="phoneViewTitle">
        <span class="phone-view-heart" aria-hidden="true">&#9825;</span>
        <h1 id="phoneViewTitle">A little invitation,<br>best viewed on a phone</h1>
        <p id="phoneViewMessage">You’re on a computer or a larger screen. Would you like to open our invitation in a phone-sized view?</p>
        <div class="phone-view-actions">
          <button type="button" id="acceptPhoneView">Yes, open phone view</button>
          <button type="button" id="declinePhoneView">No, thank you</button>
        </div>
      </section>`;
    document.body.appendChild(shell);
    const prompt = shell.querySelector('.phone-view-prompt');
    const accept = shell.querySelector('#acceptPhoneView');
    const decline = shell.querySelector('#declinePhoneView');
    accept.focus();

    decline.addEventListener('click', () => {
      shell.querySelector('#phoneViewMessage').textContent =
        'The invitation will stay closed. Please open this same link on your phone, or choose phone view below whenever you’re ready.';
      decline.hidden = true;
      accept.focus();
    });

    accept.addEventListener('click', () => {
      prompt.hidden = true;
      const frame = document.createElement('iframe');
      frame.id = 'invitationPhoneFrame';
      frame.title = 'Wedding invitation in phone view';
      // Preserve the private invite token, all other query parameters and tab hash.
      frame.src = window.location.href;
      frame.allow = 'camera; fullscreen';
      shell.appendChild(frame);
      frame.addEventListener('load', () => frame.contentWindow?.focus());
    }, { once: true });
  }, { once: true });
})();
