/* six_console_v2.js — 六段提示词操作台（T004，按总指挥 prototype.html 对齐）
 *
 * 原则（对齐清单.md）：
 *  - 布局、交互、文案照 prototype.html，不改设计；本模块只做数据适配。
 *  - 数据源：原 six_ui.js 的 cards[i].area（六段文本唯一数据源）。新界面读写
 *    cards[i].area.value 并派发 input 事件，原有 persist()/saveEdit()/快照逻辑照常工作。
 *  - 原来的卡片 DOM 不再显示，但保留在页面上作为数据载体；其全部控件都有新入口
 *    （检视栏 / 本段设置抽屉 / 剧情与设置条 / 底栏）。
 *  - 纯函数在 six_console_v2_core.js，原样复制自原型。
 */
import {app} from '/scripts/app.js';
import {api} from '/scripts/api.js';
import {parse,serialize,splitShots,joinShots,dialogues,normalizeImported,splitImported,lint,highlight,markq,searchSegments,sectionName,sectionHelp,displayFull,restoreFull,fullOffset,validateShotTimes,SEC_KEYS,SHOT_KEYS} from './six_console_v2_core.js?v=20261029fulltext1';

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

import {mountIdentityRail} from './h3_identity_refs.js?v=20261028t009a';
const CSS=`
.s2-console{--bg:#14171c;--panel:#1b1f26;--panel2:#222831;--line:#323a46;--line2:#3f4957;
  --text:#e3e7ee;--dim:#9aa4b2;--faint:#6c7685;
  --accent:#3b82f6;--accent2:#2563eb;--green:#22a06b;--green2:#1b7f55;
  --yellow:#d9a400;--red:#e5484d;--purple:#a78bfa;--cyan:#38bdf8;--orange:#f59e0b;--pink:#f472b6;
  --mono:"Cascadia Mono","Consolas","Microsoft YaHei UI",monospace;
  --sans:"Microsoft YaHei UI","PingFang SC","Segoe UI",sans-serif;
  box-sizing:border-box;width:100%;height:100%;background:var(--panel);border:1px solid var(--line);border-radius:10px;
  display:grid;grid-template-rows:auto auto auto 1fr auto;grid-template-columns:minmax(0,1fr);overflow:hidden;position:relative;
  color:var(--text);font:13px/1.5 var(--sans);text-align:left}
.s2-console *{box-sizing:border-box;min-width:0}
.s2-hidden-by-v2{display:none!important}
.s2-console button{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line2);border-radius:6px;min-height:28px;padding:0 10px;cursor:pointer}
.s2-console button:hover{border-color:#5b6778}
.s2-console button:disabled{opacity:.45;cursor:not-allowed}
.s2-console button.primary{background:var(--accent2);border-color:var(--accent)}
.s2-console button.go{background:var(--green2);border-color:var(--green)}
.s2-console button.ghost{background:transparent}
.s2-console input,.s2-console select,.s2-console textarea{font:inherit;color:var(--text);background:#10141a;border:1px solid var(--line2);border-radius:6px}
.s2-console input,.s2-console select{min-height:28px;padding:0 8px}
/* 顶栏 */
.s2-top{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);background:#181c23}
.s2-top h1{font-size:15px;margin:0 6px 0 0;white-space:nowrap}
.s2-console .six-header{display:flex;align-items:center;gap:8px;background:transparent;border:0;padding:0;margin:0;height:auto;min-height:0}
.s2-console .six-header h2{display:none}
.s2-console .six-header .six-project{width:140px;height:28px;font-size:12px}
.s2-console .six-header>.six-status{max-width:150px;max-height:26px;margin:0;padding:2px 6px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px!important;line-height:16px;color:#cbd6e2;background:#1b2632}
.s2-console .six-header>.six-status[data-state=error]{color:#ffdce0;background:#682e38}
.s2-console .six-header>.six-status[data-state=warning]{color:#ffdfa2;background:#574523}
.s2-console .six-header>.six-status[data-state=success]{color:#a5f0c4;background:#214433}
.s2-console .six-merge-badge{border-radius:999px;background:#2a2f38;color:#aab3c0;padding:2px 8px;font-size:12px;font-weight:600;white-space:nowrap;border:0}
.s2-console .six-task-details:popover-open{position:fixed;inset:auto;margin:0;max-height:42vh;overflow:auto;background:#202936;color:#edf2f7;border:1px solid #52657a;border-radius:7px;padding:12px;max-width:800px;white-space:pre-line}
.s2-console .six-task-progress{white-space:pre-line}
.s2-seg-switch{display:flex;border:1px solid var(--line2);border-radius:7px;overflow:hidden;flex:none}
.s2-seg-switch button{border:0;border-radius:0;background:transparent;min-height:28px}
.s2-seg-switch button.on{background:var(--accent2)}
.s2-search{position:relative;flex:1;display:flex;gap:6px;align-items:center;min-width:160px}
.s2-search input{flex:1;min-width:100px}
.s2-search label{font-size:12px;color:var(--dim);white-space:nowrap;display:flex;align-items:center;gap:3px}
.s2-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:2px 8px;border-radius:999px;white-space:nowrap;font-weight:600}
.s2-pill.s2-done{background:#163b2a;color:#5fe0a4}
.s2-pill.s2-run{background:#14304f;color:#7cc0ff}
.s2-pill.s2-wait{background:#2a2f38;color:#aab3c0}
.s2-pill.s2-fail{background:#4a1b1f;color:#ff9aa0}
.s2-pill.s2-warn{background:#4a3a0a;color:#ffd666}
.s2-pill.s2-ok{background:#163b2a;color:#5fe0a4}
/* 搜索结果 */
.s2-results{position:absolute;left:0;right:0;top:34px;z-index:20;background:#11151b;border:1px solid var(--line2);border-radius:8px;max-height:380px;overflow:auto;box-shadow:0 10px 30px #000a;display:none}
.s2-results .s2-bar{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#11151b}
.s2-results .s2-bar input{flex:1}
.s2-results .s2-hit{padding:6px 10px;border-bottom:1px solid #222a35;cursor:pointer;font-size:12px}
.s2-results .s2-hit:hover{background:#1a2230}
.s2-results .s2-hit .s2-where{color:var(--cyan);margin-right:6px;font-weight:600}
.s2-results mark{background:#7c5c00;color:#fff;border-radius:2px}
.s2-results .s2-empty{padding:10px;color:var(--dim)}
/* 剧情与设置条 */
.s2-storywrap{border-bottom:1px solid var(--line);padding:8px 12px 6px;display:flex;flex-direction:column;gap:6px}
.s2-console .six-story{display:grid;grid-template-columns:1fr 250px auto;gap:8px;padding:0;margin:0;border:0;height:auto}
.s2-console .six-story>label{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--dim);min-width:0}
.s2-console .six-story>label .six-cloud-warning{font-size:12px}
.s2-console textarea.six-input{width:100%;height:40px;resize:vertical;padding:5px 8px;font:13px/1.45 var(--sans);background:#10141a;border:1px solid var(--line2);border-radius:6px;color:var(--text)}
.s2-console .six-story .six-generate{min-height:34px;align-self:end;background:var(--accent2);border-color:var(--accent);color:#fff}
.s2-opts{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:12px;color:var(--dim)}
.s2-console .six-config-one,.s2-console .six-config-two{display:contents}
.s2-console .six-config-one>label,.s2-console .six-config-two>label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--dim);white-space:nowrap;margin:0}
.s2-console .six-config-one .six-model{width:150px;min-height:28px;font-size:12px}
.s2-console .six-config-one .six-model-start,.s2-console .six-config-two select{min-height:28px;font-size:12px}
.s2-console .six-model-label{max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:var(--dim)}
.s2-console .h3-cn-switch{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dim);margin:0}
.s2-console .h3-cross-group,.s2-console .h3-long-song{border:0!important;padding:0!important;margin:0!important;background:transparent;display:flex;flex-wrap:wrap;align-items:center;gap:5px;font-size:12px;color:var(--dim)}
.s2-console .h3-cross-group .cross-source,.s2-console .h3-long-song .song-source{width:170px;min-height:28px;font-size:12px}
.s2-console .h3-long-song .song-start,.s2-console .h3-long-song .song-lyric-start{width:60px;min-height:28px;font-size:12px}
.s2-console .h3-long-song .song-mode{min-height:28px;font-size:12px;max-width:150px}
.s2-console .h3-cross-group .cross-status,.s2-console .h3-long-song .song-status,.s2-console .h3-long-song .song-effective-start{width:100%;font-size:12px;color:var(--faint);font-weight:400}
/* 段轨道 */
.s2-rail{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding:8px 12px;border-bottom:1px solid var(--line)}
.s2-tile{position:relative;border:1px solid var(--line2);border-radius:8px;padding:5px 8px;background:var(--panel2);cursor:pointer;min-height:58px}
.s2-tile.s2-sel{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset;background:#1d2a3d}
.s2-tile .s2-row1{display:flex;justify-content:space-between;align-items:center;gap:4px}
.s2-tile b{font-size:14px}
.s2-tile .s2-time{font-size:12px;color:var(--dim)}
.s2-tile .s2-tile-run{position:absolute;right:6px;bottom:5px;min-height:22px;padding:1px 8px;font-size:12px;border-radius:5px;border:1px solid var(--line2);background:#1f3a2c;color:#d8f5e4;cursor:pointer}
.s2-tile .s2-tile-run.s2-rerun{background:#3a2f1a;color:#ffe2a8}
.s2-tile .s2-tile-run:disabled{opacity:.45;cursor:not-allowed}
.s2-tile .s2-plan{font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.s2-tile .s2-prog{height:4px;background:#2b3340;border-radius:2px;margin-top:4px;overflow:hidden}
.s2-tile .s2-prog i{display:block;height:100%;background:var(--accent)}
.s2-badges{position:absolute;top:-6px;right:-4px;display:flex;gap:3px}
.s2-badge{font-size:12px;line-height:17px;min-width:17px;padding:0 4px;border-radius:8px;text-align:center;font-weight:700}
.s2-badge.s2-dirty{background:var(--orange);color:#1b1300}
.s2-badge.s2-lint{background:var(--red);color:#fff}
/* 工作区 */
.s2-work{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:0}
.s2-editor{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--line)}
.s2-etools{display:flex;align-items:center;gap:6px;padding:7px 10px;border-bottom:1px solid var(--line)}
.s2-tabs{display:flex;gap:4px}
.s2-tabs button.on{background:var(--accent2);border-color:var(--accent)}
.s2-etools .s2-sp{flex:1}
.s2-etools label{font-size:12px;color:var(--dim);display:flex;align-items:center;gap:4px}
.s2-save-state{font-size:12px;color:var(--dim)}
.s2-save-state.s2-dirty{color:var(--orange);font-weight:700}
.s2-save-state.s2-save-error{color:#ff9aa0;font-weight:700}
.s2-save-state.s2-save-ok{color:#5fe0a4;font-weight:700}
.s2-ebody{flex:1;min-height:0;display:flex}
.s2-ebody>.s2-main{flex:1;min-width:0;overflow:auto;padding:10px}
.s2-ebody>.s2-cn{width:42%;border-left:1px solid var(--line);display:none;flex-direction:column;min-width:0}
.s2-ebody.s2-withcn>.s2-cn{display:flex}
.s2-cn h4{margin:0;padding:8px 10px;font-size:12px;color:var(--dim);border-bottom:1px solid var(--line)}
.s2-cn textarea{flex:1;border:0;border-radius:0;padding:10px;resize:none;font:13px/1.65 var(--sans);background:#11151b}
/* 分节 */
.s2-sec{border:1px solid var(--line);border-radius:8px;margin-bottom:10px;background:#181d25}
.s2-sec>header{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--line);cursor:pointer;user-select:none}
.s2-sec>header .s2-k{font-family:var(--mono);color:var(--purple);font-size:12px}
.s2-sec>header .s2-n{font-weight:700}
.s2-sec>header .s2-meta{margin-left:auto;font-size:12px;color:var(--dim)}
.s2-sec.s2-collapsed>.s2-sbody{display:none}
.s2-sec.s2-collapsed>header{border-bottom:0}
.s2-sec.s2-preface,.s2-sec.s2-no-sections{border-color:#8a6b2a}
.s2-no-sections .s2-no-title{margin:0 0 8px;color:#ffd666}
.s2-sbody{padding:8px 10px}
textarea.s2-auto{width:100%;resize:vertical;min-height:52px;padding:8px 10px;font:13px/1.6 var(--mono);background:#10141a;overflow:hidden}
.s2-shot{border:1px solid #2b3442;border-radius:7px;margin:8px 0;background:#141921}
.s2-shot .s2-sh{display:flex;align-items:center;gap:8px;padding:4px 8px;border-bottom:1px solid #2b3442;font-size:12px}
.s2-shot .s2-sh .s2-no{color:var(--cyan);font-weight:700;font-family:var(--mono)}
.s2-shot .s2-sh .s2-tm{background:#0f2a3c;color:#7cd3ff;padding:1px 6px;border-radius:4px;font-family:var(--mono)}
.s2-shot .s2-time-input{width:5em;min-height:26px}
.s2-time-error{color:#ff9aa0;font-size:12px;min-height:1.4em}
.s2-shot .s2-sh .s2-dl{color:var(--pink)}
.s2-shot textarea.s2-auto{border:0;border-radius:0 0 7px 7px;background:transparent}
.s2-intro-label{font-size:12px;color:var(--dim);margin:2px 0 4px}
/* 台词表 */
.s2-dtools{display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:12px;color:var(--dim)}
table.s2-dl{width:100%;border-collapse:collapse;font-size:12px}
table.s2-dl th{text-align:left;color:var(--dim);font-weight:600;padding:5px 6px;border-bottom:1px solid var(--line);position:sticky;top:-10px;background:var(--panel)}
table.s2-dl td{padding:4px 6px;border-bottom:1px solid #252c37;vertical-align:top}
table.s2-dl td.s2-w{white-space:nowrap;color:var(--cyan);font-family:var(--mono)}
table.s2-dl input.s2-lang{width:74px}
table.s2-dl textarea{width:100%;min-height:30px;resize:vertical;padding:4px 6px;font:13px/1.5 var(--sans)}
table.s2-dl tr.s2-cur{background:#17263a}
table.s2-dl .s2-jump{min-height:24px;padding:0 6px;font-size:12px}
/* 全文 */
.s2-full{position:relative;height:100%;min-height:300px}
.s2-full pre,.s2-full textarea{position:absolute;inset:0;margin:0;padding:10px 12px;font:13px/1.65 var(--mono);white-space:pre-wrap;word-wrap:break-word;overflow:auto;border-radius:8px;tab-size:2}
.s2-full pre{color:transparent;background:#10141a;border:1px solid var(--line2);pointer-events:none}
.s2-full textarea{background:transparent;color:var(--text);caret-color:#fff;border:1px solid transparent;resize:none}
.s2-full pre .hk{color:#c4b5fd;background:#2d2350;border-radius:3px}
.s2-full pre .hs{color:#38bdf8;background:#0f2a3c;border-radius:3px}
.s2-full pre .ht{color:#7cd3ff;background:#0f2a3c;border-radius:3px}
.s2-full pre .hg{color:#fbbf24;background:#3a2c08;border-radius:3px}
.s2-full pre .hx{color:#f9a8d4;background:#3b1430;border-radius:3px}
.s2-full pre .hd{color:#f9a8d4;background:#3b1430;border-radius:3px}
.s2-full pre mark{background:#a37800;border-radius:2px}
.s2-full textarea::selection{background:#3b82f680}
.s2-legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin-bottom:6px}
.s2-legend span i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.s2-fullwrap{display:flex;flex-direction:column;height:100%}
.s2-fullwrap .s2-full{flex:1}
/* 检视栏 */
.s2-insp{overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px;position:relative}
.s2-card{border:1px solid var(--line);border-radius:8px;background:#181d25;padding:8px 10px}
.s2-card h3{margin:0 0 6px;font-size:13px;display:flex;align-items:center;gap:6px}
.s2-card h3 .s2-sp{flex:1}
.s2-videoslot .six-video-wrap{display:flex;flex-direction:column;flex:1;min-height:54px;min-width:0;margin-top:4px;overflow:hidden;aspect-ratio:16/9;width:100%;height:auto!important}
.s2-videoslot .six-video{width:100%;height:100%;min-height:44px;flex:1;object-fit:contain;background:#080c12;border-radius:6px}
.s2-videoslot .six-video-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dim)}
.s2-kv{font-size:12px;line-height:1.55}
.s2-kv div{margin-bottom:3px}
.s2-kv b{color:var(--dim);font-weight:600;margin-right:4px}
.s2-lint li{font-size:12px;margin-bottom:3px}
.s2-lint ul{margin:0;padding-left:16px}
.s2-lint .e{color:#ff9aa0}.s2-lint .w{color:#ffd666}
.s2-lint .s2-none{color:#5fe0a4;font-size:12px}
.s2-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.s2-compile-reason{font-size:12px;color:#ffd666;margin-bottom:6px;overflow-wrap:anywhere}
.s2-drawer{position:absolute;inset:0;background:#161b22;border-left:1px solid var(--line2);padding:10px;display:none;flex-direction:column;gap:8px;z-index:5;overflow:auto}
.s2-drawer.s2-open{display:flex}
.s2-drawer h3{margin:0;font-size:14px;display:flex;align-items:center}
.s2-drawer h3 .s2-sp{flex:1}
.s2-console .six-card-options{display:none;flex-direction:column;gap:8px}
.s2-drawer.s2-open .six-card-options{display:flex}
.s2-console .six-card-options .h3-popover-close{display:none}
.s2-console .six-card-options .six-guide{border:1px solid var(--line2);border-radius:6px;padding:6px;margin:0;background:#141921}
.s2-console .six-card-options .six-guide input[type=number]{width:85px;background:#10151d;color:#fff;border:1px solid #527281}
.s2-console .six-card-options .six-segment-parameters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:6px 0}
.s2-console .six-card-options .six-segment-parameters label{font-size:12px;line-height:1.35;color:var(--dim)}
.s2-console .six-card-options .six-segment-parameters input{box-sizing:border-box;width:100%;min-width:0;background:#10151d;color:#fff;border:1px solid #527281;border-radius:4px;padding:3px}
.s2-console .six-card-options .six-actions{display:flex;gap:6px}
.s2-console .six-card-options small{font-size:12px;color:var(--dim)}
.s2-drawer .s2-field{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--dim)}
/* 总览 */
.s2-overview{display:none;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px 12px;overflow:auto}
.s2-console.s2-ov .s2-work{display:none}
.s2-console.s2-ov .s2-overview{display:grid}
.s2-ocard{border:1px solid var(--line2);border-radius:8px;background:var(--panel2);padding:8px;display:flex;flex-direction:column;gap:6px}
.s2-ocard .s2-oh{display:flex;align-items:center;gap:6px}
.s2-ocard .s2-oh b{font-size:14px}.s2-ocard .s2-oh .s2-time{font-size:12px;color:var(--dim)}.s2-ocard .s2-oh .s2-sp{flex:1}
.s2-ocard .s2-plan{font-size:12px;color:var(--dim);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px}
.s2-ocard video{width:100%;aspect-ratio:16/9;background:#06080b;border-radius:6px;object-fit:contain;border:1px solid #232a35}
/* 底栏 */
.s2-bottom{display:grid;grid-template-columns:1fr 300px;gap:10px;align-items:center;padding:8px 12px;border-top:1px solid var(--line);background:#181c23}
.s2-console .six-footer{display:flex;flex-direction:column;gap:2px;border:0;background:transparent;padding:0;margin:0;min-height:0}
.s2-console .six-footer-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.s2-console .six-footer-actions>span{font-size:12px;color:var(--dim)}
.s2-console .six-footer-actions>.six-status[data-state="error"]{color:#ff9aa0;background:rgba(255,154,160,.18)}
.s2-console .six-run-all{height:42px;font-size:15px;font-weight:700;background:var(--green2);border-color:var(--green);color:#fff;padding:0 16px}
.s2-console .six-footer-tools{display:flex;gap:5px}
.s2-console .six-latest-output{color:var(--cyan);font-size:12px}
.s2-console .six-merge-host .h3-native-merge-controls{border:0!important;padding:0!important;margin:0!important;font-size:12px;display:flex;flex-direction:column;gap:4px;background:transparent;color:var(--dim)}
.s2-console .six-merged-preview{position:relative;height:auto;margin-top:2px}
.s2-console .six-merged-preview>span{display:block;font-size:12px;color:var(--dim)}
.s2-console .six-merged-preview>a{font-size:12px;color:var(--cyan)}
.s2-console .six-merged-preview video{display:block;width:100%;max-height:64px;margin-top:4px;border-radius:6px;background:#06080b}
/* 导入 */
.s2-imp{position:absolute;left:0;right:0;top:51px;bottom:101px;background:#151a21;border-top:1px solid var(--accent);z-index:15;display:none;grid-template-columns:1fr 360px;gap:0}
.s2-imp.s2-open{display:grid}
.s2-imp .s2-l{display:flex;flex-direction:column;padding:10px 12px;min-width:0}
.s2-imp .s2-l h3{margin:0 0 4px;font-size:14px}
.s2-imp .s2-l .s2-hint{font-size:12px;color:var(--dim);margin-bottom:6px}
.s2-imp .s2-l textarea{flex:1;resize:none;padding:10px;font:13px/1.55 var(--mono)}
.s2-imp .s2-r{border-left:1px solid var(--line);padding:10px 12px;display:flex;flex-direction:column;gap:8px;overflow:auto}
.s2-imp .s2-r h4{margin:0;font-size:13px}
.s2-imp .s2-seg{border:1px solid var(--line2);border-radius:7px;padding:6px 8px;font-size:12px;background:#1a2029}
.s2-imp .s2-seg .s2-h{display:flex;gap:6px;align-items:center;margin-bottom:2px}
.s2-imp .s2-seg .s2-h b{font-size:13px}
.s2-imp .s2-ok{color:#5fe0a4}.s2-imp .s2-bad{color:#ff9aa0}.s2-imp .s2-mid{color:#ffd666}
.s2-imp .s2-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--dim)}
.s2-imp .s2-acts button.primary{min-height:34px}
/* 提交门 / toast */
.s2-gate{position:absolute;inset:0;background:#000a;z-index:40;display:none;align-items:center;justify-content:center}
.s2-gate.s2-open{display:flex}
.s2-gate-card{background:#1b2027;border:1px solid var(--line2);border-radius:10px;padding:14px 16px;max-width:520px;max-height:80%;overflow:auto}
.s2-gate-card h3{margin:0 0 8px;font-size:14px}
.s2-gate-card p{margin:0 0 6px;font-size:13px}
.s2-gate-card ul{margin:0 0 10px;padding-left:18px;font-size:12px}
.s2-gate-card .e{color:#ff9aa0}
.s2-gate-card .s2-row{justify-content:flex-end}
.s2-toast{position:absolute;right:12px;bottom:72px;background:#0f2a1d;border:1px solid var(--green);color:#bff3da;padding:6px 10px;border-radius:7px;font-size:12px;display:none;z-index:30}
.s2-toast button{margin-left:8px;min-height:24px;font-size:12px}
`;

function parsePlan(str){
  const m=/开头状态：([\s\S]*?)[；;]\s*新动作：([\s\S]*?)[；;]\s*结尾状态：([\s\S]*)/.exec(str||'');
  return m?{start:m[1].trim(),act:m[2].trim(),end:m[3].trim()}:{start:'',act:(str||'').trim(),end:''};
}
function loadJSON(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null}catch(e){return null}}
function saveJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
/* A064-3：身份取不到时禁止读写本机数据 */
function readLocal(key){return key?loadJSON(key):null}
function writeLocal(key,value){if(key)saveJSON(key,value)}

let installing=false;
function installWhenReady(){
  const timer=setInterval(()=>{
    try{
      const nodes=(app.graph?._nodes||[]).filter(n=>n.type==='H3SixDirectorState'&&n.__sixUI&&n.__sixRoot);
      for(const node of nodes){
        if(node.__sixRoot.dataset.s2v2==='1')continue;
        if(node.__sixUI.chainSnapshot?.().busy)continue;
        if(typeof node.__sixUI.previewCompile!=='function')continue; // 等 installCompilerPreview 就绪
        install(node);
      }
    }catch(e){console.warn('[six-console-v2] poll',e)}
  },700);
}
function install(node){
  try{installInner(node)}catch(e){installing=false;node.__sixRoot.dataset.s2v2='';console.error('[six-console-v2] 安装失败',e);throw e}
}
function installInner(node){
  const root=node.__sixRoot,ui=node.__sixUI,old=root.querySelector('.h3-six');
  if(!old||installing)return;installing=true;root.dataset.s2v2='1';
  old.classList.add('s2-hidden-by-v2');

  const style=document.createElement('style');style.textContent=CSS;root.append(style);
  const v2=document.createElement('section');v2.className='s2-console';root.append(v2);

  /* ---------- 顶栏 ---------- */
  v2.innerHTML=`
  <div class="s2-top">
    <h1>六段导演台</h1>
    <span class="s2-host-header"></span>
    <div class="s2-seg-switch"><button type="button" class="s2-mEdit on">编辑</button><button type="button" class="s2-mOv">总览</button></div>
    <button type="button" class="s2-import-btn primary" title="把其他 AI 生成的整段或六段文字粘贴进来，自动拆分">📋 粘贴导入</button>
    <div class="s2-search">
      <input class="s2-q" placeholder="搜索六段：台词、镜头、标签、任意文字（回车）" autocomplete="off">
      <label><input type="checkbox" class="s2-qcn">含中文</label>
      <div class="s2-results"></div>
    </div>
  </div>
  <div class="s2-storywrap">
    <span class="s2-host-story"></span>
    <div class="s2-opts"><span class="s2-host-config1"></span><span class="s2-host-config2"></span></div>
  </div>
  <div class="s2-rail"></div>
  <div class="s2-work">
    <div class="s2-editor">
      <div class="s2-etools">
        <div class="s2-tabs"><button type="button" data-tab="sec" class="on">分节</button><button type="button" data-tab="dlg">台词</button><button type="button" data-tab="full">全文</button></div>
        <label><input type="checkbox" class="s2-cnToggle">中文对照</label>
        <span class="s2-sp"></span>
        <span class="s2-save-state">已保存</span>
        <button type="button" class="s2-revert ghost" title="恢复导演模型给出的原稿">恢复原稿</button>
        <button type="button" class="s2-save primary" title="Ctrl+S">保存</button>
      </div>
      <div class="s2-ebody">
        <div class="s2-main"></div>
        <div class="s2-cn"><h4>中文对照稿（可编辑，不直接提交给模型）</h4><textarea class="s2-cnText" spellcheck="false"></textarea></div>
      </div>
    </div>
    <div class="s2-insp"></div>
  </div>
  <div class="s2-overview"></div>
  <div class="s2-bottom">
    <span class="s2-host-footer"></span>
    <span class="s2-host-merge"></span>
  </div>
  <div class="s2-imp">
    <div class="s2-l">
      <h3>粘贴导入（自动拆分）</h3>
      <div class="s2-hint">把其他 AI 生成的文字整个粘贴到下面：可以只有一段，也可以六段一起。会自动识别段落、小节、镜头和台词；会去掉代码块标记。右侧先预览，确认后再导入。</div>
      <textarea class="s2-impText" spellcheck="false" placeholder="在这里粘贴（Ctrl+V）……"></textarea>
    </div>
    <div class="s2-r">
      <h4>识别结果</h4>
      <div class="s2-impPreview" style="display:flex;flex-direction:column;gap:6px"><div style="font-size:12px;color:var(--dim)">粘贴后这里显示拆分结果</div></div>
      <div class="s2-acts">导入到：从 <select class="s2-impStart"><option value="0">S1</option><option value="1">S2</option><option value="2">S3</option><option value="3">S4</option><option value="4">S5</option><option value="5">S6</option></select> 开始</div>
      <div class="s2-acts"><button type="button" class="s2-impGo primary" disabled>导入</button><button type="button" class="s2-impClose">取消</button><span>导入后可撤销；会覆盖目标段的英文提示词（原稿仍可恢复）</span></div>
    </div>
  </div>
  <div class="s2-gate"><div class="s2-gate-card"></div></div>
  <div class="s2-toast"></div>`;

  /* ---------- 搬迁原有行（整行物理搬移，监听全部保留） ---------- */
  const find=s=>v2.querySelector(s);
  find('.s2-host-header').replaceWith(root.querySelector('.six-header'));
  find('.s2-host-story').replaceWith(root.querySelector('.six-story'));
  find('.s2-host-config1').replaceWith(root.querySelector('.six-config-one'));
  find('.s2-host-config2').replaceWith(root.querySelector('.six-config-two'));
  find('.s2-host-footer').replaceWith(root.querySelector('.six-footer'));
  find('.s2-host-merge').replaceWith(root.querySelector('.six-merge-host'));

  /* ---------- 状态 ---------- */
  /* A064-3：与 six_ui/director 使用同一身份函数（node.__sixIdentity）；无身份时不产生本机键 */
  const wfKey=()=>{try{const identity=node.__sixIdentity?.();return identity?encodeURIComponent(identity):null}catch{return null}};
  const origKey=()=>{const key=wfKey();return key?'h3-six-v2-orig:'+key+':'+node.id:null};
  const cnKey=()=>{const key=wfKey();return key?'h3-six-v2-cn:'+key+':'+node.id:null};
  const readSeg=i=>ui.cards[i].area.value;
  /* 原弹层元素登记（搬入抽屉后不再是卡片子节点，必须持引用才能搬回） */
  const cardExtras=ui.cards.map(c=>c.card.querySelector('.six-card-options'));
  let cur=Math.max(0,Math.min(5,Number(app.graph?.getNodeById?.(159)?.properties?.h3_six_active_segment)||0)),tab='sec',mode='edit',query='';
  const collapsed=new Set();
  let cn=Array(6).fill(''),savedCn=Array(6).fill('');
  let originals=Array(6).fill(''),savedEn=ui.cards.map(c=>c.area.value);
  let originalsInit=false;
  /* 原稿捕获：安装时六段文本可能尚未由生产同步写入（areas 为空），
     因此推迟到首次观察到非空文本时捕获，并持久化以便刷新后恢复。 */
  function ensureOriginals(){
    if(originalsInit)return;
    const vals=ui.cards.map(c=>c.area.value);
    if(!vals.some(v=>v.trim()))return;
    const stored=readLocal(origKey());
    if(stored?.texts?.length===6&&stored.texts.some(v=>v.trim())&&stored.groupId===(group?.id??null))originals=stored.texts;
    else originals=vals;
    savedEn=vals.slice();
    writeLocal(origKey(),{groupId:group?.id??null,texts:originals});
    originalsInit=true;
  }
  let plan=Array(6).fill(null),group=null,lastGroupId=null;
  let lastCompile={state:'none',reason:''};
  const flushTimer=Array(6).fill(null);
  let impParts=[],impTouched=false,scope='cur';
  const storedCn=readLocal(cnKey());
  if(Array.isArray(storedCn)&&storedCn.length===6){cn=storedCn.map(v=>v??'');savedCn=cn.slice();}
  const duration=()=>{try{return Number(app.graph.getNodeById(132)?.widgets?.[0]?.value)||10}catch(e){return 10}};
  const segmentDuration=i=>{const frames=Number(ui.segmentSettingsSnapshot?.()?.[i]?.length);return frames>0?Math.max(4,Math.min(15,Math.round(frames/24))):duration()};
  const timeLabel=i=>{const d=duration();return `${(i*d).toFixed(1)}–${((i+1)*d).toFixed(1)} 秒`};

  function toast(msg){const t=find('.s2-toast');t.textContent=msg;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',2200)}
  function isDirty(i){return readSeg(i)!==savedEn[i]||cn[i]!==savedCn[i]}
  function writeSeg(i,text){const area=ui.cards[i].area;if(area.value===text)return false;area.value=text;area.dispatchEvent(new Event('input',{bubbles:true}));clearTimeout(flushTimer[i]);if(!(ui.group||group)?.id)flushTimer[i]=setTimeout(()=>{savedEn[i]=readSeg(i);refreshMeta()},700);return true}
  function statusInfo(i){
    const t=ui.cards[i].status.textContent||'';
    if(/失败|丢失/.test(t))return ['fail',t];
    if(/SUCCESS|已完成|已恢复/.test(t))return ['done',t];
    if(/执行中|生成中|队列/.test(t)){const p=ui.cards[i].progress;const v=p&&!p.hidden?Math.round(Number(p.value)||0):null;return ['run',v!=null?`生成中 ${v}%`:t]}
    return ['wait',t];
  }
  function pillHtml(i){const [c,t]=statusInfo(i);return `<span class="s2-pill s2-${c}">${esc(t)}</span>`}
  function lintCount(i){return lint({no:i+1,en:readSeg(i)}).filter(x=>x[0]==='e').length}

  /* ---------- 段计划 / 中文对照 / 原稿 ---------- */
  function ensureGroupMeta(){
    const g=ui.group||null,gid=g?.id||null;
    if(gid===lastGroupId)return;
    lastGroupId=gid;group=g;
    if(g){
      plan=Array(6).fill(null).map((_,i)=>parsePlan(g.segment_plan?.[i]));
      const stored=readLocal(origKey());
      if(stored?.groupId===gid&&stored.texts?.length===6)originals=stored.texts;
      else{originals=g.segments.map(s=>s.english_prompt??'');writeLocal(origKey(),{groupId:gid,texts:originals})}
      const localCn=readLocal(cnKey());
      cn=Array(6).fill('').map((_,i)=>localCn?.[i]??g.segments[i]?.draft?.chinese_prompt??'');
      savedCn=cn.slice();
      savedEn=ui.cards.map(c=>c.area.value);
    }
  }
  /* 安装时若 UI 尚无组数据，只读拉取最新组补齐段计划/中文对照（不覆盖文本） */
  (async()=>{try{
    const r=await api.fetchApi('/api/h3-director/groups/latest');if(!r.ok)return;
    const g=await r.json();if(ui.group||!g?.id)return;
    lastGroupId=g.id;group=g;
    plan=Array(6).fill(null).map((_,i)=>parsePlan(g.segment_plan?.[i]));
    const localCn=readLocal(cnKey());
    cn=Array(6).fill('').map((_,i)=>localCn?.[i]??g.segments[i]?.draft?.chinese_prompt??'');
    if(!readLocal(origKey()))writeLocal(origKey(),{groupId:g.id,texts:g.segments.map(s=>s.english_prompt??'')});
    refreshMeta();
  }catch(e){}})();

  /* ---------- 段轨道 ---------- */
  function renderRail(){
    if(document.activeElement?.closest('.t009-shared,.t009-segment'))return;
    const identityPark=node.__identityRail;if(identityPark){identityPark.shared.remove();identityPark.cards.forEach(c=>c.remove());identityPark.error.remove()}
    find('.s2-rail').innerHTML=ui.cards.map((c,i)=>{
      const e=lintCount(i);
      return `<div class="s2-tile ${i===cur&&mode==='edit'?'s2-sel':''}" data-i="${i}" title="${esc(plan[i]?.act||'')}">
        <div class="s2-badges">${isDirty(i)?'<span class="s2-badge s2-dirty" title="有未保存的修改">未存</span>':''}${e?`<span class="s2-badge s2-lint" title="检查发现 ${e} 个问题">${e}</span>`:''}</div>
        <div class="s2-row1"><b>S${i+1}</b>${pillHtml(i)}</div>
        <div class="s2-time">${esc(timeLabel(i))}</div>
        <div class="s2-plan">${esc(plan[i]?.act||'—')}</div>
        ${i===0?`<div class="s2-cross-state">接续上一组：${node.properties.h3_cross_group?.enabled===true?'已开启':'关闭'}</div>`:''}${tileRunButton(i)}
        ${statusInfo(i)[0]==='run'?`<div class="s2-prog"><i style="width:${Math.round(Number(ui.cards[i].progress?.value)||0)}%"></i></div>`:''}
      </div>`;}).join('');
    mountIdentityRail(find('.s2-rail'),node,ui);
    find('.s2-rail').querySelectorAll('.s2-tile').forEach(el=>el.onclick=()=>select(+el.dataset.i));
    find('.s2-rail').querySelectorAll('.s2-tile-run').forEach(el=>el.onclick=event=>{event.stopPropagation();const i=+el.dataset.i;el.disabled=true;Promise.resolve(ui.runActive(i)).catch(error=>toast(`S${i+1} 未提交：${error.message}`)).finally(()=>renderRail())});
  }
  // A084：段卡片上的「生成 / 重跑」：没有历史时直接生成；已有历史时重跑（旧版自动归档保留）。与「重抽这段」同一入口 runActive。
  function tileRunButton(i){
    const receipt=(ui.receiptSnapshot?.()||{})[i];const has=!!receipt?.prompt_id;
    const reason=ui.runBlockReason?.(i)||'';
    return `<button type="button" class="s2-tile-run ${has?'s2-rerun':''}" data-i="${i}" ${reason?'disabled':''} title="${esc(reason||'自动保存并生成本段')}">${has?'↻ 重跑':'▶ 生成'}</button>${reason?`<span class="s2-run-reason">${esc(reason)}</span>`:''}`;
  }

  /* ---------- 编辑区 ---------- */
  function autosize(ta){ta.style.height='auto';ta.style.height=(ta.scrollHeight+2)+'px'}
  function renderSec(){
    const s=readSeg(cur),p=parse(s);let html='';
    if(!p.secs.length){
      html=`<div class="s2-sec s2-no-sections"><header><span class="s2-n">未识别到小节标题</span></header><div class="s2-sbody"><p class="s2-no-title">没有识别到小节标题，已按全文显示；可以在『全文』里编辑，或用『📋 粘贴导入』自动整理</p><textarea class="s2-auto s2-whole-text" data-whole="true" spellcheck="false">${esc(p.pre)}</textarea></div></div>`;
    }else if(p.pre){
      html+=`<div class="s2-sec s2-preface"><header><span class="s2-n">未归入小节的文字</span></header><div class="s2-sbody"><textarea class="s2-auto" data-preface="true" spellcheck="false">${esc(p.pre)}</textarea></div></div>`;
    }
    if(p.secs.length)p.secs.forEach((sec,si)=>{
      const name=sectionName(sec.key),col=collapsed.has(sec.key);
      let inner;
      if(SHOT_KEYS.has(sec.key)){
        const {intro,shots}=splitShots(sec.body);
        const times=node.properties.h3_manual_shot_times?.[cur]||[];
        inner=`<div class="s2-intro-label">风格开场（第一个镜头之前）</div><textarea class="s2-auto" data-sec="${si}" data-part="intro">${esc(intro.replace(/\s+$/,''))}</textarea><p>镜头时间可手填（秒，精确到 0.1）；不填写时沿用自动时间。本段 ${segmentDuration(cur)} 秒。 <button type="button" class="s2-time-reset">恢复自动时间</button></p><div class="s2-time-error" aria-live="polite"></div>`+
          shots.map((sh,k)=>{const dn=(sh.text.match(/<d>/g)||[]).length;return `<div class="s2-shot"><div class="s2-sh"><span class="s2-no">镜头 ${sh.no}</span><label>开始 <input class="s2-time-input" data-time-index="${k}" data-time-field="start" type="number" min="0" step="0.1" value="${esc(String(times[k]?.start??''))}"></label><label>结束 <input class="s2-time-input" data-time-index="${k}" data-time-field="end" type="number" min="0" step="0.1" value="${esc(String(times[k]?.end??''))}"></label>${dn?`<span class="s2-dl">台词 ${dn} 句</span>`:''}</div><textarea class="s2-auto" data-sec="${si}" data-shot="${k}">${esc(sh.text.replace(/\s+$/,''))}</textarea></div>`;}).join('');
      }else inner=`<textarea class="s2-auto" data-sec="${si}">${esc(sec.body)}</textarea>`;
      const meta=SHOT_KEYS.has(sec.key)?`${splitShots(sec.body).shots.length} 个镜头`:`${sec.body.length} 字符`;
      html+=`<div class="s2-sec ${col?'s2-collapsed':''}" data-key="${esc(sec.key)}"><header><span class="s2-n">${esc(name)}</span><span class="s2-meta">${meta} · ${col?'展开':'收起'}</span></header><div class="s2-sbody"><p class="s2-section-help">${esc(sectionHelp(sec.key))}</p>${inner}</div></div>`;
    });
    const main=find('.s2-main');main.innerHTML=html;
    main.querySelectorAll('.s2-sec>header').forEach(h=>h.onclick=()=>{const k=h.parentElement.dataset.key;collapsed.has(k)?collapsed.delete(k):collapsed.add(k);renderSec()});
    main.querySelectorAll('textarea.s2-auto').forEach(ta=>{autosize(ta);ta.addEventListener('input',()=>{autosize(ta);commitSec(ta)})});
    const timeError=()=>{const box=main.querySelector('.s2-time-error');if(!box)return;try{const sec=parse(readSeg(cur)).secs.find(s=>SHOT_KEYS.has(s.key));validateShotTimes(node.properties.h3_manual_shot_times?.[cur]||[],segmentDuration(cur),sec?splitShots(sec.body).shots.length:0);box.textContent=''}catch(e){box.textContent=e.message}};
    main.querySelectorAll('.s2-time-input').forEach(input=>input.addEventListener('input',()=>{const times=node.properties.h3_manual_shot_times??=Array(6).fill(null);const count=main.querySelectorAll('.s2-shot').length;if(!Array.isArray(times[cur]))times[cur]=Array.from({length:count},()=>({start:'',end:''}));const i=+input.dataset.timeIndex;if(!times[cur][i])times[cur][i]={start:'',end:''};times[cur][i][input.dataset.timeField]=input.value;app.graph.setDirtyCanvas(true,true);timeError()}));
    main.querySelector('.s2-time-reset')?.addEventListener('click',()=>{if(node.properties.h3_manual_shot_times)node.properties.h3_manual_shot_times[cur]=null;app.graph.setDirtyCanvas(true,true);renderSec()});timeError();
  }
  function commitSec(ta){
    const i=cur,p=parse(readSeg(i));
    if(ta.dataset.whole){writeSeg(i,ta.value);return}
    if(ta.dataset.preface){p.pre=ta.value;writeSeg(i,serialize(p));return}
    const sec=p.secs[+ta.dataset.sec];if(!sec)return;
    const keepTrail=(orig,val)=>val+(orig.match(/\s*$/)[0]);
    if(SHOT_KEYS.has(sec.key)&&(ta.dataset.part==='intro'||ta.dataset.shot!==undefined)){
      const sp=splitShots(sec.body);
      if(ta.dataset.part==='intro')sp.intro=keepTrail(sp.intro,ta.value);
      else{const k=+ta.dataset.shot;sp.shots[k].text=keepTrail(sp.shots[k].text,ta.value)}
      sec.body=joinShots(sp.intro,sp.shots);
    }else sec.body=ta.value;
    writeSeg(i,serialize(p));
  }
  function renderDlg(){
    const all=scope==='all';
    const list=all?ui.cards.flatMap((c,i)=>dialogues({no:i+1,en:readSeg(i)})):dialogues({no:cur+1,en:readSeg(cur)});
    const main=find('.s2-main');
    main.innerHTML=`<div class="s2-dtools">范围：<select class="s2-dscope"><option value="cur">本段 S${cur+1}</option><option value="all" ${all?'selected':''}>全部六段</option></select><span>共 ${list.length} 句。直接修改台词或语言，离开输入框即写回原位置；格式自动保持为 &lt;d&gt;[语言] …&lt;/d&gt;。</span></div>
    <table class="s2-dl"><thead><tr><th>段</th><th>镜头</th><th>时间</th><th>发声人</th><th>语言</th><th style="width:52%">台词</th><th></th></tr></thead><tbody>${
      list.map((d,i)=>`<tr class="${all&&d.seg===cur+1?'s2-cur':''}"><td class="s2-w">S${d.seg}</td><td class="s2-w">${d.shot??'-'}</td><td class="s2-w">${esc(d.time||'')}</td><td>${esc(d.speaker)}</td><td><input class="s2-lang" data-i="${i}" value="${esc(d.lang)}"></td><td><textarea data-i="${i}">${esc(d.text)}</textarea></td><td><button type="button" class="s2-jump" data-i="${i}" title="在全文中定位">定位</button></td></tr>`).join('')||'<tr><td colspan="7" style="color:var(--dim);padding:12px">没有台词</td></tr>'
    }</tbody></table>`;
    main.querySelector('.s2-dscope').onchange=e=>{scope=e.target.value;renderDlg()};
    const write=(idx,field,val)=>{
      const d=list[idx],segIdx=d.seg-1,full=readSeg(segIdx);
      const fresh=dialogues({no:d.seg,en:full}).find(x=>x.langStart===d.langStart)||d;
      const nv=field==='text'?full.slice(0,fresh.textStart)+val+full.slice(fresh.textEnd):full.slice(0,fresh.langStart)+val.replace(/[\[\]]/g,'')+full.slice(fresh.langEnd);
      writeSeg(segIdx,nv);
    };
    main.querySelectorAll('table textarea').forEach(ta=>ta.addEventListener('change',()=>{write(+ta.dataset.i,'text',ta.value);renderDlg()}));
    main.querySelectorAll('input.s2-lang').forEach(inp=>inp.addEventListener('change',()=>{write(+inp.dataset.i,'lang',inp.value);renderDlg()}));
    main.querySelectorAll('button.s2-jump').forEach(b=>b.onclick=()=>{const d=list[+b.dataset.i];const fresh=dialogues({no:d.seg,en:readSeg(d.seg-1)}).find(x=>x.langStart===d.langStart)||d;jumpTo(d.seg-1,fresh.textStart,fresh.textEnd)});
  }
  let hlTimer=null;
  function renderFull(){
    const s=readSeg(cur),main=find('.s2-main');
    main.innerHTML=`<div class="s2-fullwrap"><div class="s2-legend"><span><i style="background:#c4b5fd"></i>小节</span><span><i style="background:#38bdf8"></i>镜头</span><span><i style="background:#7cd3ff"></i>时间</span><span><i style="background:#fbbf24"></i>引用标签</span><span><i style="background:#f9a8d4"></i>发声人 / 台词</span><span>· Ctrl+F 搜索用顶部搜索框（跨六段）</span></div><div class="s2-full"><pre class="s2-hl"></pre><textarea class="s2-ft" spellcheck="false"></textarea></div></div>`;
    const ta=main.querySelector('.s2-ft'),hl=main.querySelector('.s2-hl'),view=displayFull(s);let lastShown=view.text;
    ta.value=lastShown;hl.innerHTML=highlight(lastShown,query);
    // Write back after a short pause instead of on every keystroke; flush on blur/segment change.
    const seg=cur;let saveTimer=null;
    const flush=()=>{if(saveTimer===null)return;clearTimeout(saveTimer);saveTimer=null;writeSeg(seg,restoreFull(lastShown,view.headers))};
    ta.addEventListener('input',()=>{lastShown=ta.value;clearTimeout(saveTimer);saveTimer=setTimeout(flush,200);clearTimeout(hlTimer);hlTimer=setTimeout(()=>{hl.innerHTML=highlight(lastShown,query)},250)});
    ta.addEventListener('blur',flush);
    ta.__flush=flush;
    ta.addEventListener('scroll',()=>{hl.scrollTop=ta.scrollTop});
  }
  function renderEditor(){
    v2.querySelectorAll('.s2-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
    if(tab==='sec')renderSec();else if(tab==='dlg')renderDlg();else renderFull();
    find('.s2-cnText').value=cn[cur]||'';
  }
  function commitCn(){
    cn[cur]=find('.s2-cnText').value;
    const local=readLocal(cnKey())||Array(6).fill(null);local[cur]=cn[cur];writeLocal(cnKey(),local);
    refreshMeta();
  }
  find('.s2-cnText').addEventListener('input',commitCn);

  /* ---------- 检视栏 ---------- */
  /* 重建检视栏前，把上一轮搬入的「重抽这段」按钮 / 视频容器 / 设置抽屉搬回隐藏卡片，
     避免 innerHTML 重建销毁仍被 six_ui 引用的原始元素。 */
  function park(){
    ui.cards.forEach((c,i)=>{
      try{
        if(c.run&&c.run.isConnected&&!c.card.contains(c.run))c.card.querySelector('.six-card-foot')?.append(c.run);
        const wrap=c.video?.parentElement;
        if(wrap&&wrap.isConnected&&!c.card.contains(wrap))c.card.prepend(wrap);
        const extra=cardExtras[i];
        if(extra&&!c.card.contains(extra))c.card.append(extra);
      }catch(e){}
    });
  }
  function renderInsp(){
    park();
    const i=cur,[sc,st]=statusInfo(i),l=lint({no:i+1,en:readSeg(i)});
    const comp=lastCompile.state==='ok'?`<span class="s2-pill s2-ok">正常</span>`
      :lastCompile.state==='fallback'?`<span class="s2-pill s2-warn">已按原稿提交</span>`
      :lastCompile.state==='fail'?`<span class="s2-pill s2-fail">失败</span>`:`<span class="s2-pill s2-wait">未编译</span>`;
    const insp=find('.s2-insp');
    insp.innerHTML=`
    <div class="s2-card"><h3>S${i+1} 本段视频 <span class="s2-sp"></span><span class="s2-insp-pill">${pillHtml(i)}</span></h3>
      <div class="s2-videoslot"></div>
    </div>
    <div class="s2-card"><h3>段计划</h3><div class="s2-kv"><div><b>开头</b>${esc(plan[i]?.start||'—')}</div><div><b>新动作</b>${esc(plan[i]?.act||'—')}</div><div><b>结尾</b>${esc(plan[i]?.end||'—')}</div></div></div>
    <div class="s2-card"><h3>提示词编译 <span class="s2-sp"></span>${comp}</h3>
      ${lastCompile.state!=='none'&&lastCompile.reason?`<div class="s2-compile-reason">${esc(lastCompile.reason)}</div>`:''}
      <div class="s2-row"><button type="button" class="s2-compileBtn">${lastCompile.state==='fallback'||lastCompile.state==='fail'?'重试编译':'预览编译结果'}</button></div></div>
    <div class="s2-card s2-lint"><h3>检查 <span class="s2-sp"></span>${l.length?`<span class="s2-pill ${l.some(x=>x[0]==='e')?'s2-fail':'s2-warn'}">${l.length} 项</span>`:'<span class="s2-pill s2-ok">通过</span>'}</h3>
      ${l.length?`<ul>${l.map(x=>`<li class="${x[0]}">${esc(x[1])}</li>`).join('')}</ul>`:'<div class="s2-none">格式符合 H3 范本</div>'}</div>
    <div class="s2-card"><h3>本段操作</h3><div class="s2-row s2-opsrow"></div></div>
    <div class="s2-drawer"><h3>S${i+1} 本段设置（低频）<span class="s2-sp"></span><button type="button" class="s2-dClose" title="Esc">✕</button></h3><div class="s2-drawer-body"></div></div>`;
    /* 视频元素整体搬入（唯一实例，随段切换） */
    const slot=insp.querySelector('.s2-videoslot');
    const c=ui.cards[i];
    slot.append(c.card.querySelector('.six-video-wrap')||c.video.parentElement);
    /* 重抽这段（原按钮搬入，禁用状态由原 controls() 管理） */
    insp.querySelector('.s2-opsrow').append(c.run);
    const settingsBtn=document.createElement('button');settingsBtn.type='button';settingsBtn.textContent='本段设置';
    settingsBtn.onclick=()=>openDrawer(i);insp.querySelector('.s2-opsrow').append(settingsBtn);
    /* 本段设置抽屉：原弹层内容整体搬入 */
    const extra=cardExtras[i];
    if(extra){extra.removeAttribute('popover');extra.removeAttribute('style');const close=extra.querySelector('.h3-popover-close');if(close){close.onclick=null;close.remove()}
      const trigger=c.card.querySelector(`button[popovertarget="six-card-options-${i}"]`);
      if(trigger){trigger.removeAttribute('popovertarget');trigger.style.anchorName='';trigger.style.positionAnchor='';}
      insp.querySelector('.s2-drawer-body').append(extra);}
    insp.querySelector('.s2-dClose').onclick=()=>insp.querySelector('.s2-drawer').classList.remove('s2-open');
    insp.querySelector('.s2-compileBtn').onclick=async()=>{
      const btn=insp.querySelector('.s2-compileBtn');btn.disabled=true;btn.textContent='检查中…';
      try{const result=await ui.previewCompile(i);
        if(result.status==='COMPILED'||result.status==='VALIDATED')lastCompile={state:'ok',reason:''};
        else if(result.status==='RAW_FALLBACK')lastCompile={state:'fallback',reason:result.reason||'8210 编译器暂不可用，已按原稿保留'};
        else lastCompile={state:'fail',reason:result.reason||result.error||'检查未完成'};
      }catch(error){lastCompile={state:'fail',reason:error.message}}
      renderInsp();
    };
  }
  function openDrawer(i){const d=find('.s2-insp').querySelector('.s2-drawer');d.classList.add('s2-open')}
  function closeDrawer(){const d=find('.s2-insp')?.querySelector('.s2-drawer');if(d)d.classList.remove('s2-open')}

  /* ---------- 总览 ---------- */
  function renderOverview(){
    find('.s2-overview').innerHTML=ui.cards.map((c,i)=>`<div class="s2-ocard" data-i="${i}"><div class="s2-oh"><b>S${i+1}</b><span class="s2-time">${esc(timeLabel(i))}</span><span class="s2-sp"></span><span class="s2-ovpill">${pillHtml(i)}</span></div>
      <div class="s2-ovvideo"></div>
      <div class="s2-plan">${esc(plan[i]?.act||'—')}</div>
      <div class="s2-row"><button type="button" data-edit="${i}">编辑提示词</button><button type="button" class="go" data-re="${i}">⟳ 重抽</button></div></div>`).join('');
    ui.cards.forEach((c,i)=>{
      const holder=find(`.s2-ocard[data-i="${i}"] .s2-ovvideo`);
      const ref=c.videoRef;
      if(ref){const v=document.createElement('video');v.controls=true;v.preload='metadata';v.setAttribute('aria-label',`第${i+1}段视频（总览）`);
        v.src=api.apiURL('/view?'+new URLSearchParams({filename:ref.filename,subfolder:ref.subfolder,type:ref.type}).toString());holder.append(v);}
      else{const [sc,st]=statusInfo(i);holder.innerHTML=`<div style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:12px;border:1px dashed #232a35;border-radius:6px">${esc(st)}</div>`}
    });
    find('.s2-overview').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{setMode('edit');select(+b.dataset.edit)});
    find('.s2-overview').querySelectorAll('[data-re]').forEach(b=>b.onclick=()=>ui.cards[+b.dataset.re].run.click());
  }
  function refreshOverviewLive(){
    if(mode!=='ov')return;
    find('.s2-overview').querySelectorAll('.s2-ocard').forEach(card=>{
      const i=+card.dataset.i;card.querySelector('.s2-ovpill').innerHTML=pillHtml(i);
      const holder=card.querySelector('.s2-ovvideo');
      if(ui.cards[i].videoRef&&!holder.querySelector('video'))renderOverview();
    });
  }

  /* ---------- 模式 / 选择 ---------- */
  function setMode(m){mode=m;v2.classList.toggle('s2-ov',m==='ov');find('.s2-mEdit').classList.toggle('on',m==='edit');find('.s2-mOv').classList.toggle('on',m==='ov');if(m==='ov')renderOverview();else refreshMeta()}
  find('.s2-mEdit').onclick=()=>setMode('edit');
  find('.s2-mOv').onclick=()=>setMode('ov');
  function select(i){cur=i;if(mode==='ov')setMode('edit');ui.select(i);renderAll()}
  function refreshMeta(){renderRail();renderInsp();updateSaveState()}
  function renderAll(){renderRail();renderEditor();renderInsp();updateSaveState()}
  function updateSaveState(){
    const s=find('.s2-save-state'),dirty=isDirty(cur),activeGroup=ui.group||group;
    const state=s.dataset.state;s.classList.remove('s2-dirty','s2-save-error','s2-save-ok');
    if(!activeGroup?.id){s.textContent='本机草稿（未关联导演组，仅保存在此浏览器）';s.dataset.state='draft';return}
    if(state==='saving')return;
    if(state==='error'){s.classList.add('s2-save-error');return}
    if(dirty){s.textContent='● 未保存';s.classList.add('s2-dirty');s.dataset.state='dirty'}
    else{s.textContent='已保存到服务器';s.classList.add('s2-save-ok');s.dataset.state='server'}
  }
  function refreshLive(){ensureGroupMeta();ensureOriginals();renderRail();if(mode==='edit'){const pill=find('.s2-insp').querySelector('.s2-insp-pill');if(pill)pill.innerHTML=pillHtml(cur);updateSaveState()}else refreshOverviewLive()}
  root.addEventListener('sixpromptserversave',event=>{
    const {segment_index,english_prompt,ok,error}=event.detail||{},i=Number(segment_index);
    if(!Number.isInteger(i)||i<0||i>=6)return;
    const s=find('.s2-save-state');
    if(ok){savedEn[i]=english_prompt;clearTimeout(flushTimer[i]);if(i===cur){s.dataset.state='server';s.textContent='已保存到服务器'}refreshMeta()}
    else if(i===cur){s.dataset.state='error';s.textContent='保存失败：'+String(error||'未知错误');s.classList.remove('s2-save-ok','s2-dirty');s.classList.add('s2-save-error')}
  });
  root.addEventListener('sixpromptdraftsave',event=>{const {segment_index,english_prompt}=event.detail||{},i=Number(segment_index);if(Number.isInteger(i)&&i>=0&&i<6){savedEn[i]=english_prompt;clearTimeout(flushTimer[i]);refreshMeta()}});
  ui.setBeforeRunHook?.(async i=>{if(cn[i]!==savedCn[i]){const key=cnKey();if(!key)throw Error('中文对照无法保存，请先保存工作流再重跑');const data=readLocal(key)||Array(6).fill('');data[i]=cn[i];localStorage.setItem(key,JSON.stringify(data));if(readLocal(key)?.[i]!==cn[i])throw Error('中文对照保存失败，未提交');savedCn[i]=cn[i];refreshMeta()}});

  /* ---------- 保存 / 恢复原稿 ---------- */
  function saveCurrent(){
    find('.s2-ft')?.__flush?.();
    const i=cur,text=readSeg(i);clearTimeout(flushTimer[i]);ensureGroupMeta();
    const activeGroup=ui.group||group,s=find('.s2-save-state');
    s.classList.remove('s2-dirty','s2-save-error','s2-save-ok');
    if(!activeGroup?.id){savedEn[i]=text;savedCn[i]=cn[i];s.dataset.state='draft';refreshMeta();toast('本机草稿仅保存在此浏览器');return}
    s.dataset.state='saving';s.textContent='正在保存到服务器…';
    api.fetchApi('/api/h3-director/groups/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({group_id:activeGroup.id,segment_index:i,english_prompt:text})})
      .then(async response=>{const value=await response.json().catch(()=>({}));if(!response.ok)throw Error(value.error||`HTTP ${response.status}`);savedEn[i]=text;savedCn[i]=cn[i];s.dataset.state='server';refreshMeta();toast(`S${i+1} 已保存到服务器`);})
      .catch(error=>{s.dataset.state='error';s.textContent='保存失败：'+String(error?.message||error);s.classList.remove('s2-save-ok','s2-dirty');s.classList.add('s2-save-error')});
  }
  find('.s2-save').onclick=saveCurrent;
  find('.s2-revert').onclick=()=>{if(readSeg(cur)===originals[cur]){toast('已经是原稿');return}writeSeg(cur,originals[cur]);renderAll();toast(`S${cur+1} 已恢复为导演模型原稿（保存后生效）`)};

  /* ---------- 全局搜索 ---------- */
  function showResults(){
    const q=find('.s2-q').value.trim();query=q;const box=find('.s2-results');
    if(!q){box.style.display='none';if(tab==='full')renderFull();return}
    const hits=searchSegments(q,ui.cards.map((c,i)=>({no:i+1,en:readSeg(i),cn:cn[i]||''})),find('.s2-qcn').checked);
    box.innerHTML=`<div class="s2-bar"><span style="font-size:12px;color:var(--dim)">「${esc(q)}」共 ${hits.length} 处</span><input class="s2-rep" placeholder="替换为…"><button type="button" class="s2-repAll" ${hits.filter(h=>h.field==='en').length?'':'disabled'}>全部替换</button><button type="button" class="s2-rClose">关闭</button></div>`+
      (hits.length?hits.map((h,k)=>`<div class="s2-hit" data-k="${k}"><span class="s2-where">S${h.i+1} · ${esc(h.where)}</span>${markq(h.ctx,q)}</div>`).join(''):'<div class="s2-empty">没有找到</div>');
    box.style.display='block';
    box.querySelectorAll('.s2-hit').forEach(el=>el.onclick=()=>{const h=hits[+el.dataset.k];box.style.display='none';if(h.field==='cn'){select(h.i);find('.s2-cnToggle').checked=true;find('.s2-ebody').classList.add('s2-withcn');const ta=find('.s2-cnText');ta.focus();ta.setSelectionRange(h.start,h.end)}else jumpTo(h.i,h.start,h.end)});
    box.querySelector('.s2-rClose').onclick=()=>box.style.display='none';
    box.querySelector('.s2-repAll').onclick=()=>{
      const r=box.querySelector('.s2-rep').value;const snap=ui.cards.map(c=>c.area.value);
      const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');let n=0;const changed=[];
      ui.cards.forEach((c,i)=>{const nv=readSeg(i).replace(re,()=>{n++;return r});if(nv!==snap[i]){writeSeg(i,nv);changed.push(i)}});
      box.innerHTML=`<div class="s2-bar"><span style="font-size:12px">已替换 ${n} 处（仅英文提示词）</span><button type="button" class="s2-undoRep">撤销</button><button type="button" class="s2-rClose2">关闭</button></div>`;
      box.querySelector('.s2-undoRep').onclick=()=>{changed.forEach(i=>writeSeg(i,snap[i]));box.style.display='none';renderAll();toast('已撤销替换')};
      box.querySelector('.s2-rClose2').onclick=()=>box.style.display='none';
      renderAll();
    };
  }
  function jumpTo(i,start,end){
    setMode('edit');cur=i;tab='full';ui.select(i);renderAll();
    const ta=find('.s2-ft');if(!ta)return;const headers=displayFull(readSeg(i)).headers,a=fullOffset(start,headers),b=fullOffset(end,headers);ta.focus();ta.setSelectionRange(a,b);
    const before=ta.value.slice(0,a);const lines=before.split('\n').length;ta.scrollTop=Math.max(0,(lines-4)*21.45);find('.s2-hl').scrollTop=ta.scrollTop;
  }
  find('.s2-q').addEventListener('keydown',e=>{if(e.key==='Enter')showResults();if(e.key==='Escape')find('.s2-results').style.display='none'});
  find('.s2-q').addEventListener('input',()=>{if(!find('.s2-q').value)showResults()});
  find('.s2-qcn').onchange=()=>{if(find('.s2-q').value)showResults()};

  /* ---------- 粘贴导入 ---------- */
  function impPreview(){
    impParts=splitImported(find('.s2-impText').value);
    const raw=find('.s2-impText').value.trim();
    const box=find('.s2-impPreview'),go=find('.s2-impGo');
    if(!raw){box.innerHTML='<div style="font-size:12px;color:var(--dim)">粘贴后这里显示拆分结果</div>';go.disabled=true;return}
    const multi=impParts.length>1;
    if(!impTouched)find('.s2-impStart').value=String(multi?(impParts[0].no?impParts[0].no-1:0):cur);
    const start=+find('.s2-impStart').value;
    box.innerHTML=`<div style="font-size:12px">识别到 <b>${impParts.length}</b> 段${impParts.length>6?'（超过 6 段，只导入前 6 段）':''}</div>`+impParts.slice(0,6).map((p,k)=>{
      const target=p.no&&multi?p.no-1:start+k;const over=target>5;
      return `<div class="s2-seg"><div class="s2-h"><b>${over?'—':'→ S'+(target+1)}</b>${p.no?`<span style="color:var(--dim)">原文标记：第 ${p.no} 段</span>`:''}</div>
      <div>${p.secs===0?'<span class="s2-mid">这段没识别到小节标题，将按全文导入</span>':`<span class="${p.secs===6?'s2-ok':'s2-bad'}">小节 ${p.secs}/6</span>`} · 镜头 ${p.shots} · 台词 ${p.dlg} · ${p.errs?`<span class="s2-bad">格式问题 ${p.errs}</span>`:'<span class="s2-ok">格式通过</span>'}${!over&&isDirty(Math.min(target,5))?' · <span class="s2-mid">目标段有未保存修改，将被覆盖</span>':''}</div></div>`;}).join('');
    go.disabled=!impParts.length;
    go.textContent=`导入 ${Math.min(impParts.length,6)} 段`;
  }
  find('.s2-import-btn').onclick=()=>{impTouched=false;find('.s2-imp').classList.add('s2-open');find('.s2-impText').focus();impPreview()};
  find('.s2-impClose').onclick=()=>find('.s2-imp').classList.remove('s2-open');
  find('.s2-impText').addEventListener('input',impPreview);
  find('.s2-impStart').onchange=()=>{impTouched=true;impPreview()};
  find('.s2-impGo').onclick=()=>{
    const multi=impParts.length>1,start=+find('.s2-impStart').value;
    const snap=ui.cards.map(c=>c.area.value);const done=[];
    impParts.slice(0,6).forEach((p,k)=>{const t=p.no&&multi?p.no-1:start+k;if(t>5)return;if(writeSeg(t,p.text))done.push(t)});
    find('.s2-imp').classList.remove('s2-open');find('.s2-impText').value='';
    cur=done.length?Math.min(...done):cur;tab='sec';setMode('edit');renderAll();
    const t=find('.s2-toast');
    t.innerHTML=`已导入 ${done.map(i=>'S'+(i+1)).join('、')}（未保存）<button type="button" class="s2-undoImp">撤销导入</button>`;t.style.display='block';
    clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',8000);
    t.querySelector('.s2-undoImp').onclick=()=>{ui.cards.forEach((c,i)=>{if(snap[i]!==readSeg(i))writeSeg(i,snap[i])});t.style.display='none';renderAll()};
  };

  /* ---------- 提交前检查门（对齐清单 §3） ---------- */
  const gate=find('.s2-gate'),gateCard=find('.s2-gate-card');
  function showGate(bads,btn){
    gateCard.innerHTML=`<h3>提交前检查发现问题</h3><p>${bads.map(b=>`第 ${b.i+1} 段有 ${b.list.length} 个格式错误`).join('；')}</p>
    <ul>${bads.flatMap(b=>b.list.slice(0,4).map(x=>`<li class="e">S${b.i+1}：${esc(x[1])}</li>`)).join('')}</ul>
    <div class="s2-row"><button type="button" class="s2-gate-fix">去修改</button><button type="button" class="s2-gate-cancel">取消</button><button type="button" class="s2-gate-go primary">仍然提交</button></div>`;
    gate.classList.add('s2-open');
    gateCard.querySelector('.s2-gate-go').onclick=()=>{gate.classList.remove('s2-open');btn.dataset.s2Bypass='1';btn.click()};
    gateCard.querySelector('.s2-gate-fix').onclick=()=>{gate.classList.remove('s2-open');select(bads[0].i);tab='sec';renderEditor()};
    gateCard.querySelector('.s2-gate-cancel').onclick=()=>gate.classList.remove('s2-open');
  }
  root.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const isChain=btn.classList.contains('six-run-all'),isRun=btn.classList.contains('six-execute');
    if(!isChain&&!isRun)return;
    if(btn.dataset.s2Bypass==='1'){delete btn.dataset.s2Bypass;return}
    if(btn.disabled)return;
    let targets;
    if(isRun){const idx=ui.cards.findIndex(c=>c.run===btn);if(idx<0)return;targets=[idx]}
    else{const first=Number(root.querySelector('.six-start')?.value)||0;targets=[];for(let i=first;i<6;i++)targets.push(i)}
    const bads=targets.map(i=>({i,list:lint({no:i+1,en:readSeg(i)}).filter(x=>x[0]==='e')})).filter(b=>b.list.length);
    if(bads.length){e.preventDefault();e.stopImmediatePropagation();showGate(bads,btn)}
  },true);

  /* ---------- 标签页 / 快捷键 ---------- */
  v2.querySelectorAll('.s2-tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderEditor()});
  find('.s2-cnToggle').onchange=e=>find('.s2-ebody').classList.toggle('s2-withcn',e.target.checked);
  v2.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveCurrent()}
    else if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();find('.s2-q').focus();find('.s2-q').select()}
    else if(e.key==='Escape'){closeDrawer();find('.s2-results').style.display='none';find('.s2-imp').classList.remove('s2-open')}
  });

  /* ---------- 与 six_ui 保持同步 ---------- */
  root.addEventListener('sixchange',()=>{refreshLive()});
  root.addEventListener('sixrecoverydisplay',()=>{renderAll()});
  root.addEventListener('sixsegmentselect',event=>{const index=Number(event.detail?.index);if(Number.isInteger(index)&&index>=0&&index<6&&index!==cur){cur=index;if(mode==='ov')setMode('edit');renderAll()}});
  root.addEventListener('input',event=>{if(event.target.matches?.('.six-prompt'))refreshLive()});

  /* ---------- 周期刷新（状态/进度/组合入） ---------- */
  setInterval(()=>{if(!v2.isConnected)return;try{refreshLive()}catch(e){}},700);
  ensureGroupMeta();ensureOriginals();
  renderAll();
  installing=false;
  console.info('[six-console-v2] 六段提示词操作台已挂载（T004）');
}
if(!app.extensions.some(extension=>extension.name==='H3.SixConsoleV2'))
  app.registerExtension({name:'H3.SixConsoleV2',setup(){setTimeout(installWhenReady,100)}});
