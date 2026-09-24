const FRAME_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"referrer\" content=\"no-referrer\"><title>MotionC Demo — isolated placeholders</title><style>:root{font:16px/1.5 system-ui,sans-serif;color:#153b30;background:#f3f6f4}*{box-sizing:border-box}body{margin:0}header{position:sticky;top:0;z-index:1;padding:12px 18px;background:#153b30;color:white}header strong{display:block}header p{margin:2px 0;font-size:.9rem}main{max-width:960px;margin:auto;padding:18px}nav{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}button,a{font:inherit}button{padding:10px 14px;background:white;border:1px solid #537568;border-radius:6px;color:#153b30;cursor:pointer}button[aria-current=page]{background:#d7eadf;font-weight:700}button:focus-visible,a:focus-visible{outline:3px solid #be7500;outline-offset:3px}iframe{display:block;width:100%;height:430px;border:2px solid #537568;background:white;border-radius:6px}h1{font-size:1.6rem}#status{min-height:1.5em}.actions{border-top:1px solid #aabbb2;padding-top:12px}@media(max-width:400px){main{padding:12px}header{padding:10px 12px}button{padding:9px 11px}iframe{height:460px}}</style></head><body><header><strong>DEMO MODE</strong><p>Isolation test — sample information has not yet been installed.</p></header><main><h1 id=\"screen\">MotionC Demo Isolation Test</h1><p>Placeholder only. No personal information, measurements, calculations or route progress.</p><p id=\"connection\">Navigation requests stay inside the Demo shell.</p><nav aria-label=\"Demo frame navigation\"><button type=\"button\" data-request=\"home\">Demo landing</button><button type=\"button\" data-request=\"daily\">Daily</button><button type=\"button\" data-request=\"walking\">Walking / Jasper</button></nav></main><script>'use strict';\n(()=>{\n const screens=Object.freeze({home:'MotionC Demo Isolation Test',daily:'Daily — placeholder',summary:'Summary — placeholder',compass:'Compass — placeholder',walking:'Walking / Jasper — placeholder'});\n const embedded=window.parent!==window;const channel=location.hash.slice(1);const channelOK=/^[0-9a-f-]{36}$/.test(channel);\n function render(screen){document.getElementById('screen').textContent=screens[screen]||screens.home;}\n window.addEventListener('message',event=>{const m=event.data;if(!embedded||!channelOK||event.source!==parent||!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).sort().join(',')!=='channel,screen,type'||m.channel!==channel||m.type!=='motionc-demo-screen')return;render(Object.hasOwn(screens,m.screen)?m.screen:'home');});\n document.querySelectorAll('[data-request]').forEach(button=>{button.disabled=!embedded||!channelOK;button.addEventListener('click',()=>{if(embedded&&channelOK)parent.postMessage({type:'motionc-demo-request',channel,screen:button.dataset.request},'*');});});\n if(!embedded)document.getElementById('connection').textContent='Direct-open isolation is active. Open /demo/ in the address bar for shell navigation.';\n})();</script></body></html>\n";

const FRAME_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; object-src 'none'; connect-src 'none'; form-action 'none'; worker-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; manifest-src 'none'; style-src 'sha256-jVGM6xvAr8cG0Ei45pv7YiuhRLSCcnqDq5JP4XF5v9E='; script-src 'sha256-7wN7akwFhAeeT2+10gsXe40g46Ush2cv1C1cnhMkPFY='; frame-src 'none'; frame-ancestors 'self'; sandbox allow-scripts",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Type": "text/html; charset=utf-8"
});

export default {
  fetch(request) {
    const headers = new Headers(FRAME_HEADERS);
    if (request.method !== "GET" && request.method !== "HEAD") {
      headers.set("Allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    return new Response(request.method === "HEAD" ? null : FRAME_HTML, {
      status: 200,
      headers
    });
  }
};
