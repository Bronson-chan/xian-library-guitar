// Run with NODE_PATH pointing to a local Playwright installation. No production dependency.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.MOTION_QA_URL || 'http://127.0.0.1:43130/xian-library-guitar/';
const baseline = execFileSync('git', ['show', 'HEAD:workbuddy/site/index.html'], { encoding: 'utf8', maxBuffer: 2e6 });
const current = readFileSync('workbuddy/site/index.html', 'utf8');
const seed = {fav:{0:true},status:{0:'known'},plays:{0:12},last:{},logs:[],seen:{},covers:{},avatars:{}};
async function frameSample(page) {
  return page.evaluate(() => new Promise(resolve => {
    const deltas = []; let start, previous;
    function frame(time) {
      if (previous !== undefined) deltas.push(time - previous);
      if (start === undefined) start = time;
      previous = time;
      if (time - start < 650) requestAnimationFrame(frame);
      else {
        const sorted = deltas.slice().sort((a,b) => a-b);
        resolve({frames:deltas.length,meanMs:+(deltas.reduce((a,b)=>a+b,0)/deltas.length).toFixed(2),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2)});
      }
    }
    if (window.revealMotion) revealMotion(document.getElementById('v-home'),280,4);
    requestAnimationFrame(frame);
  }));
}
(async () => {
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  const report = { extraHtmlBytes:Buffer.byteLength(current)-Buffer.byteLength(baseline),cases:[] };
  try {
    for (const mode of ['baseline','desktop','mobile','reduced']) {
      const context = await browser.newContext({viewport:mode==='mobile'?{width:390,height:844}:{width:1440,height:900},reducedMotion:mode==='reduced'?'reduce':'no-preference',serviceWorkers:'block'});
      await context.addInitScript(value => localStorage.setItem('wb_xiangu_v1',value), JSON.stringify(seed));
      const page = await context.newPage(), errors = [], media = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => {if(r.resourceType()==='media') media.push(r.url());});
      if (mode === 'baseline') await page.route(base, route => route.fulfill({contentType:'text/html',body:baseline}));
      await page.goto(base);
      await page.waitForFunction(() => window.__booted);
      await page.waitForLoadState('networkidle');
      const raf = await frameSample(page);
      const geometry = await page.locator('.hero').first().boundingBox();
      const layout = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.equal(layout.width, layout.scroll, 'No horizontal overflow');
      if (mode === 'baseline') {report.baselineGeometry=geometry;report.cases.push({mode,raf});await context.close();continue;}
      await page.evaluate(() => stopMotion());
      if (mode !== 'mobile') assert.deepEqual(await page.locator('.hero').first().boundingBox(),report.baselineGeometry,'Home geometry is unchanged');
      const result = await page.evaluate(() => {
        const t = performance.now();
        openRandomDetail(156);
        const immediate = {id:cur,visible:!el('detail').hidden,duration:Math.max(0,...Array.from(activeMotion,a=>a.effect.getTiming().duration))};
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Shift',bubbles:true}));
        const skipped = activeMotion.size;
        for(let i=0;i<12;i++) openDetail(i);
        const lastId = cur;
        closeDetail();
        for(let i=0;i<20;i++) showView(i%2?'home':'lib','');
        stopMotion();
        const s=JSON.parse(localStorage.getItem('wb_xiangu_v1'));
        return {immediate,skipped,lastId,statePreserved:s.fav[0]===true&&s.status[0]==='known'&&s.plays[0]===12,count:SONGS.length,totalActionMs:+(performance.now()-t).toFixed(2),active:activeMotion.size};
      });
      assert.equal(result.immediate.id,156);assert.equal(result.immediate.visible,true);
      assert.equal(result.skipped,0);assert.equal(result.lastId,11);assert.equal(result.statePreserved,true);assert.equal(result.count,157);assert.equal(result.active,0);
      assert.equal(result.immediate.duration,mode==='reduced'?0:360);
      await page.evaluate(() => showView('lib',''));
      await page.locator('#q-lib').fill('爱');
      assert.equal(await page.locator('#sugbox [data-sg=s]').count(),22);
      await page.locator('#sugbox').hover();await page.mouse.wheel(0,1500);
      await page.waitForFunction(() => el('sugbox').scrollTop>0&&!el('sugbox').hidden);
      await page.evaluate(() => {closeSug();openDetail(156);});
      await page.waitForFunction(() => el('dt-img').naturalWidth===6648);
      await page.locator('#dt-canvas').hover();await page.keyboard.down('Control');await page.mouse.wheel(0,-160);await page.keyboard.up('Control');
      assert.ok(await page.evaluate(() => zoom>0),'Ctrl + wheel zoom remains available');
      await page.waitForFunction(() => activeMotion.size===0);
      assert.equal(await page.locator('#dt-img').evaluate(i=>getComputedStyle(i).transform),'none','Sheet has no movement');
      assert.deepEqual(errors,[]);assert.deepEqual(media,[]);
      report.cases.push({mode,raf,...result,errors,mediaRequests:media.length});
      await context.close();
    }
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
