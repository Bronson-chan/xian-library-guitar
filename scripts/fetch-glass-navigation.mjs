import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
const pkg=JSON.parse(await readFile(process.argv[2],'utf8'));
for(const f of pkg.files)if(createHash('sha256').update(f.content).digest('hex')!==f.sha256)throw Error('Official source checksum mismatch');
const out='workbuddy/site/tunnel/vendor/glass';await mkdir(out,{recursive:true});
let source=pkg.files.find(f=>f.path==='LiquidGlassNavigationEngine.js').content;
const configPattern=/const surface=createSurface\(target,(\{.*\}),options\);/;
const config=JSON.parse(source.match(configPattern)[1]);
// Remove the unrelated demonstration photograph and embedded font. The workbench
// supplies a small album-colour texture; the official optical shader is retained.
config.markup=config.markup.replace(/src="data:image[^"\s]+"/,'src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'640\' height=\'320\'%3E%3Crect width=\'640\' height=\'320\' fill=\'%23232b43\'/%3E%3C/svg%3E"');
const labels={Product:'全部歌曲',Resources:'漫游操作',Company:'工作台',Overview:'全部歌曲',Features:'新学曲目',Integrations:'拿手歌曲',Changelog:'很久没弹',Documentation:'换一组封面',Guides:'暂停漫游',Blog:'继续漫游',About:'打开工作台',Careers:'我的歌单',Contact:'练习记录'};
config.markup=config.markup.replace(/<button[^>]*class="menu-item"[^>]*>Pricing<\/button>/,'').replace(/<button[^>]*class="menu-item"[^>]*>Support<\/button>/,'');
for(const [from,to] of Object.entries(labels))config.markup=config.markup.replace('>'+from+'<','>'+to+'<');
config.markup=config.markup.replace('aria-label="Main navigation"','aria-label="封面漫游导航"');
config.css=config.css.replace(/@font-face\s*\{[^}]+\}/g,'');
config.css+=`\n.motion-body{background:transparent!important}.glass-navigation{min-height:0;height:var(--motion-height,330px);background:transparent!important;pointer-events:none;font-family:"Segoe UI","Microsoft YaHei",sans-serif}.nav-bar{top:0!important;gap:6px!important;width:auto!important;white-space:nowrap;border-radius:30px;padding:5px;background:linear-gradient(130deg,#ffffff17,#ffffff07);border:1px solid #ffffff25;box-shadow:inset 0 1px 0 #ffffff30,0 8px 28px #0003;backdrop-filter:blur(16px)}.nav-trigger{font-size:14px!important;padding:9px 17px!important;min-height:42px;gap:8px!important;border-radius:24px;text-shadow:none}.nav-trigger:hover,.nav-trigger[aria-expanded=true]{background:#ffffff12}.menu-item{font-size:15px;font-weight:500;transition-duration:120ms!important;transition-delay:0ms!important}.menu-item[data-selected=true]{color:#f5d1a9}.glass-dropdown-overlay{background:#14192755;backdrop-filter:blur(12px)}.glass-navigation[data-renderer=css] .glass-dropdown-overlay{background:#1a2038e8}.glass-navigation[data-renderer=css] #gl-canvas{background:none}.nav-chevron{transition-duration:150ms}@container glass-navigation (max-width:500px){.nav-trigger{font-size:13px!important;padding:8px 13px!important}.nav-bar{gap:2px!important}}`;
config.height=330;
source=source.replace(configPattern,'const surface=createSurface(target,'+JSON.stringify(config)+',options);');
source=source.replace("from './motion-runtime'","from './motion-runtime.js'")
 .replace('counts={product:5,resources:4,company:3}','counts={product:4,resources:3,company:3}')
 .replace('{alpha:false,antialias:true,preserveDrawingBuffer:true}','{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:false}')
 .replace('Math.min(window.devicePixelRatio||1,1.5)','Math.min(window.devicePixelRatio||1,1.25)');
// Transparent outside the optical panel so the real cover tunnel remains visible.
let fragment=JSON.parse(source.match(/const fragment=(".*");/)[1]);
fragment=fragment.replace('fragColor = vec4(bg, 1.0);','fragColor = vec4(0.0);').replace('vec3 col =','float panelAlpha = 0.0;\n          vec3 col =').replace('col = mix(col, glassBody, insideMask * openClamped);','col = mix(col, glassBody, insideMask * openClamped); panelAlpha = insideMask * openClamped;').replace('fragColor = vec4(col, 1.0);','fragColor = vec4(col, panelAlpha);');
if(!fragment.includes('float panelAlpha'))throw Error('Shader integration changed');
source=source.replace(/const fragment=(".*");/,'const fragment='+JSON.stringify(fragment)+';');
// No second perpetual render loop: draw only while a menu spring or click ripple
// is moving. Closed and settled menus consume no animation frames.
source=source.replace('(gl||springs.some(s=>Math.abs(s.value-s.target)>.001||Math.abs(s.vel)>.001))','(springs.some(s=>Math.abs(s.value-s.target)>.001||Math.abs(s.vel)>.001)||(active&&time-rippleTime<1.2))');
await writeFile(out+'/LiquidGlassNavigationEngine.js',source);
const runtime=pkg.files.find(f=>f.path==='motion-runtime.ts').content;
await writeFile(out+'/motion-runtime.js',stripTypeScriptTypes(runtime));
console.log('Official glass navigation adapted:',source.length,'bytes');
