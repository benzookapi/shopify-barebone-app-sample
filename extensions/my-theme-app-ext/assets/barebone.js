(() => {
  const stateKey = Symbol.for('barebone.theme-app-extension');
  const existingState = window[stateKey];

  if (existingState) {
    existingState.refresh(document);
    return;
  }

  const state = {
    proxyResponse: null,
    proxyUrl: '',
  };

  const findAll = (root, selector) => {
    const matches = [];

    if (root instanceof Element && root.matches(selector)) {
      matches.push(root);
    }

    if (typeof root.querySelectorAll === 'function') {
      matches.push(...root.querySelectorAll(selector));
    }

    return matches;
  };

  const setProxyLinks = (root = document) => {
    if (!state.proxyUrl) return;

    findAll(root, '[data-barebone-proxy-json]').forEach((link) => {
      link.href = state.proxyUrl;
    });

    findAll(root, '[data-barebone-proxy-liquid]').forEach((link) => {
      link.href = `${state.proxyUrl}&format=liquid`;
    });
  };

  const setProxyResponse = (root = document) => {
    if (state.proxyResponse === null) return;

    findAll(root, '[data-barebone-proxy-response]').forEach((element) => {
      element.textContent = state.proxyResponse;
    });
  };

  const writeShopifyDump = (block) => {
    const output = block.querySelector('[data-barebone-shopify-dump]');
    if (!output) return;

    try {
      output.textContent = JSON.stringify(window.Shopify, null, 4);
    } catch (error) {
      output.textContent = String(error);
    }
  };

  const initializeAppBlock = (block) => {
    if (block.dataset.bareboneInitialized === 'true') return;

    block.dataset.bareboneInitialized = 'true';
    writeShopifyDump(block);
    setProxyLinks(block);
    setProxyResponse(block);

    console.info('Barebone app block initialized', {
      templateName: block.dataset.templateName,
      productId: block.dataset.productId,
      selectedVariantId: block.dataset.selectedVariantId,
    });
  };

  const publishCustomEvent = (element) => {
    if (element.dataset.bareboneInitialized === 'true') return;

    element.dataset.bareboneInitialized = 'true';
    const eventName = element.dataset.eventName;

    if (!eventName || typeof window.Shopify?.analytics?.publish !== 'function') {
      return;
    }

    window.Shopify.analytics.publish(eventName, {
      template: element.dataset.templateName,
      timestamp: new Date().toISOString(),
    });
  };

  const initializeAppEmbed = (embed) => {
    if (embed.dataset.bareboneInitialized === 'true') return;

    embed.dataset.bareboneInitialized = 'true';
    const shopUrl = embed.dataset.shopUrl;
    if (!shopUrl) return;

    const cookieParam = encodeURIComponent(document.cookie);
    state.proxyUrl = `${shopUrl}/apps/bareboneproxy?_1st_party_cookie_sent_by_me=${cookieParam}`;
    setProxyLinks();

    fetch(`${shopUrl}/apps/bareboneproxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _1st_party_cookie_sent_by_me: cookieParam }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`App proxy request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        state.proxyResponse = JSON.stringify(data, null, 4);
        setProxyResponse();
      })
      .catch((error) => {
        console.error('Barebone app proxy request failed', error);
      });
  };

  const upsertHiddenInput = (form, name, value) => {
    let input = Array.from(form.elements).find(
      (element) => element.name === name && element.dataset.bareboneGenerated === 'true',
    );

    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.dataset.bareboneGenerated = 'true';
      form.append(input);
    }

    input.value = value;
  };

  const updateForms = (selector, name, value) => {
    document.querySelectorAll(selector).forEach((form) => {
      upsertHiddenInput(form, name, value);
    });
  };

  const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;

    if (input.matches('[data-barebone-line-item-property]')) {
      updateForms('form[action$="/cart/add"]', 'properties[barebone_line_item_property]', input.value);
      return;
    }

    if (input.matches('[data-barebone-cart-note]')) {
      updateForms('form[action$="/cart"]', 'note', input.value);
      return;
    }

    if (input.matches('[data-barebone-cart-attribute]')) {
      updateForms('form[action$="/cart"]', 'attributes[barebone_cart_attribute]', input.value);
      return;
    }

    if (input.matches('[data-barebone-cart-attribute-code]')) {
      updateForms('form[action$="/cart"]', 'attributes[barebone_cart_attribute_code]', input.value);
    }
  };

  const refresh = (root = document) => {
    findAll(root, '[data-barebone-app-block]').forEach(initializeAppBlock);
    findAll(root, '[data-barebone-custom-event]').forEach(publishCustomEvent);
    findAll(root, '[data-barebone-app-embed]').forEach(initializeAppEmbed);
    setProxyLinks(root);
    setProxyResponse(root);
  };

  window[stateKey] = { refresh };
  document.addEventListener('change', handleChange);
  document.addEventListener('shopify:section:load', (event) => refresh(event.target));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => refresh(document), { once: true });
  } else {
    refresh(document);
  }
})();
