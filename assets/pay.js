/* Hebrew With Mor — card and PayPal payments (PayPal JS SDK).
   Buyers can pay with a debit/credit card without a PayPal account.

   SETUP: paste the LIVE Client ID from your PayPal Business account below
   (developer.paypal.com → Apps & Credentials → Live → your app → Client ID).
   The Client ID is public by design; never put the Secret here. */
var HM_PAYPAL_CLIENT_ID = '';

/* Sends Mor an email (via Web3Forms) after every successful payment. */
var HM_NOTIFY_KEY = '1c648618-77d0-4e7e-a533-900ff958d552';

var HM = (function () {
  var sdk;

  function loadSdk() {
    if (sdk) return sdk;
    sdk = new Promise(function (resolve, reject) {
      if (!HM_PAYPAL_CLIENT_ID) return reject(new Error('no-client-id'));
      var s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(HM_PAYPAL_CLIENT_ID) +
        '&currency=USD&intent=capture&components=buttons&enable-funding=card';
      s.onload = function () { window.paypal ? resolve(window.paypal) : reject(new Error('sdk')); };
      s.onerror = function () { sdk = null; reject(new Error('sdk')); };
      document.head.appendChild(s);
    });
    return sdk;
  }

  function notify(subject, lines) {
    var d = new FormData();
    d.set('access_key', HM_NOTIFY_KEY);
    d.set('from_name', 'Hebrew With Mor website');
    d.set('subject', subject);
    Object.keys(lines).forEach(function (k) { d.set(k, lines[k]); });
    return fetch('https://api.web3forms.com/submit', { method: 'POST', body: d, headers: { Accept: 'application/json' } })
      .catch(function () {});
  }

  /* opts: { el, getAmount() -> "45.00" or null, description, onPaid(details), onError(msg) } */
  function render(opts) {
    return loadSdk().then(function (paypal) {
      opts.el.innerHTML = '';
      return paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'pay', height: 45 },
        onClick: function (data, actions) {
          return opts.getAmount() ? actions.resolve() : actions.reject();
        },
        createOrder: function (data, actions) {
          return actions.order.create({
            purchase_units: [{
              description: opts.description,
              amount: { currency_code: 'USD', value: opts.getAmount() }
            }],
            application_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'Hebrew With Mor' }
          });
        },
        onApprove: function (data, actions) {
          return actions.order.capture().then(function (d) {
            var p = d.payer || {}, n = p.name || {};
            opts.onPaid({
              id: d.id,
              name: [n.given_name, n.surname].filter(Boolean).join(' '),
              first: n.given_name || '',
              email: p.email_address || '',
              amount: opts.getAmount()
            });
          });
        },
        onError: function () { opts.onError('Sorry, the payment didn’t go through. Please try again, or contact me.'); }
      }).render(opts.el);
    });
  }

  return { render: render, notify: notify };
})();
