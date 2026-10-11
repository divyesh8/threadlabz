// Isolated local fixtures only. Extends the existing Playwright/Edge QA workflow.
// These checks do not prove PostgreSQL RLS or actual Supabase Storage behavior.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve('artifacts/phase-3/contracts');
fs.mkdirSync(output, { recursive: true });
const id = n => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const category = { id: id(900), name: 'Men', slug: 'men', is_active: true };
const festival = { id: id(901), name: 'Diwali', slug: 'diwali', is_active: true };
const products = Array.from({length: 27}, (_, i) => ({ id: id(i+1), slug: i === 0 ? 'qa-reference-shirt' : `qa-piece-${i+1}`, title: i === 0 ? 'QA fixture — reference shirt' : `QA fixture — piece ${String(i+1).padStart(2,'0')}`, description: 'Isolated QA fixture. Reference photography is used only to test this local layout, not as an actual product claim.', category_id: category.id, categories: category, price_paise: 10000 + i*1000+45, source: 'manual', is_active: true, created_at: new Date(2026, 0, 30-i).toISOString(), product_festivals: [{festival_id: festival.id}] }));
products.push({...products[0], id:id(101),slug:'qa-demo',source:'seed'});
products.push({...products[0], id:id(102),slug:'qa-inactive',is_active:false});
products.push({...products[0], id:id(103),slug:'qa-category-inactive',categories:{...category,is_active:false}});
const variants = products.flatMap((p, i) => ['XS','S','M','L','XL'].map((size,j) => ({id:id(1000+i*5+j),product_id:p.id,size,color:'Reference colour',stock:i===1||j===0?0:j===1?2:8})));
const images = products.filter(p=>p.slug!=='qa-piece-3').flatMap((p,i)=>[0,1].map(j=>({id:id(2000+i*2+j),product_id:p.id,url:`uploads/photo-${j}.jpg`,alt:`QA reference photograph ${j+1}`,sort_order:j,is_primary:j===0})));
const sourcePhoto = fs.readFileSync('public/images/previews/men-3.jpg');
const secondPhoto = fs.readFileSync('public/images/previews/men-4.jpg');
const base='http://127.0.0.1:3102';
const key='sb_publishable_phase3_local_fixture';
let mode='ready', assetMode='valid', origin, app, browser, appOutput='';
const requests=[];
const visible = p => p.is_active && ['manual','admin'].includes(p.source) && p.categories.is_active;
const mock=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'); const q=url.searchParams;
 requests.push({path:url.pathname,query:url.search});
 res.setHeader('Content-Type','application/json');
 const send=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/rest/v1/')) {
  assert.equal(req.headers.apikey,key);
  if(mode==='failure') return send({message:'Synthetic outage'},503);
  if(url.pathname.endsWith('/categories')) return send([category]);
  if(url.pathname.endsWith('/festivals')) return send([festival]);
  const from=Number(q.get('offset')||0), limit=Number(q.get('limit')||100);
  if(url.pathname.endsWith('/products')){
   assert.equal(q.get('source'),'in.(admin,manual)'); assert.equal(q.get('is_active'),'eq.true'); assert.equal(q.get('categories.is_active'),'eq.true');
   let rows=mode==='empty'?[]:products.filter(visible);
   if(q.has('slug')) rows=rows.filter(p=>p.slug===q.get('slug').slice(3));
   if(q.has('id')) rows=rows.filter(p=>p.id!==q.get('id').slice(4));
   if(q.has('title')) rows=rows.filter(p=>p.title.toLowerCase().includes(q.get('title').replace(/^ilike\.\%|\%$/g,'').toLowerCase()));
   const available=p=>variants.filter(v=>v.product_id===p.id&&v.stock>0);
   if(q.get('available')==='not.is.null') rows=rows.filter(p=>available(p).length);
   if(q.get('available')==='is.null') rows=rows.filter(p=>!available(p).length);
   if(q.has('sized.size')) rows=rows.filter(p=>available(p).some(v=>v.size===q.get('sized.size').slice(3)));
   for(const val of q.getAll('price_paise')) rows=rows.filter(p=>val.startsWith('gte.')?p.price_paise>=Number(val.slice(4)):p.price_paise<=Number(val.slice(4)));
   const order=q.get('order')||'';
   rows.sort((a,b)=>order.startsWith('price_paise.asc')?a.price_paise-b.price_paise:order.startsWith('price_paise.desc')?b.price_paise-a.price_paise:b.created_at.localeCompare(a.created_at));
   res.setHeader('Content-Range',rows.length?`${from}-${Math.min(from+limit,rows.length)-1}/${rows.length}`:'*/0');
   return send(rows.slice(from,from+limit));
  }
  if(url.pathname.endsWith('/product_images')||url.pathname.endsWith('/product_variants')) {
   const isImages=url.pathname.endsWith('/product_images');
   let rows=[...(isImages?images:variants)];
   if(q.has('id')){
    assert.equal(q.get('products.source'),'in.(admin,manual)'); assert.equal(q.get('products.is_active'),'eq.true'); assert.equal(q.get('products.categories.is_active'),'eq.true');
    rows=rows.filter(r=>r.id===q.get('id').slice(3)&&products.some(p=>p.id===r.product_id&&visible(p)));
   }
   if(q.has('product_id')) rows=rows.filter(r=>q.get('product_id').includes(r.product_id));
   if(q.has('products.source')) rows=rows.filter(r=>products.some(p=>p.id===r.product_id&&visible(p)));
   if(q.has('stock')) rows=rows.filter(r=>r.stock>0);
   if(isImages&&assetMode==='expired') rows=rows.map(r=>({...r,url:`${origin}/storage/v1/object/sign/product-images/uploads/photo-0.jpg?token=expired-local-fixture`}));
   if(isImages&&assetMode==='malformed') rows=rows.map(r=>({...r,url:'https://unapproved.invalid/private.jpg'}));
   return send(rows.slice(from,from+limit));
  }
 }
 if(url.pathname.startsWith('/storage/v1/object/')) {
  if(assetMode==='inaccessible') return send({message:'Synthetic access denied'},403);
  res.setHeader('Content-Type',assetMode==='corrupt'?'image/png':'image/jpeg');
  return res.end(assetMode==='corrupt'?Buffer.from('<html>not an image</html>'):url.pathname.includes('photo-1')?secondPhoto:sourcePhoto);
 }
 send({message:'No synthetic session'},401);
});
try {
 await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
 origin=`http://127.0.0.1:${mock.address().port}`;
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3102'],{windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:origin,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,SITE_URL:base},stdio:['ignore','pipe','pipe']});
 app.stdout.on('data',d=>{appOutput+=d});app.stderr.on('data',d=>{appOutput+=d});
 let ready=false;
 for(let i=0;i<100;i++){if(app.exitCode!==null)throw Error('Fixture app stopped');try{if((await fetch(`${base}/shop`)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready);
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const reports=[];
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const go=async route=>{const r=await page.goto(base+route,{waitUntil:'networkidle'});await page.locator('main').waitFor();return r;};
  const shot=async name=>{await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`${name}-${width}.png`),fullPage:true});await page.screenshot({path:path.join(output,`${name}-viewport-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'Page overflow');};
  mode='ready';assetMode='valid';await go('/shop');
  assert.equal(await page.locator('.catalogue-card').count(),24);
  assert.equal(await page.locator('.catalogue-card a').count(),24);
  await page.getByRole('status').filter({hasText:'27 pieces'}).waitFor();
  await shot('shop');
  await page.locator('.filter-panel summary').click();
  await shot('filters');await page.getByLabel('Category',{exact:true}).selectOption('men');await page.getByLabel('Festival',{exact:true}).selectOption('diwali');
  await page.getByLabel('Sort by').selectOption('price-desc');await page.getByLabel('Available size').selectOption('M');
  await page.getByLabel('Minimum price (₹)').fill('100');await page.getByLabel('Maximum price (₹)').fill('500');await page.getByLabel('Availability',{exact:true}).selectOption('in-stock');
  await page.getByRole('button',{name:'Apply filters'}).click();await page.waitForLoadState('networkidle');
  await page.getByRole('link',{name:'Next page',exact:false}).click();await page.waitForURL(u=>u.searchParams.get('page')==='2');await page.waitForLoadState('networkidle');
  for(const [key,value] of Object.entries({category:'men',festival:'diwali',sort:'price-desc',size:'M',min:'100',max:'500',availability:'in-stock',page:'2'}))assert.equal(new URL(page.url()).searchParams.get(key),value);
  assert.equal(await page.locator('.catalogue-card').count(),2);
  await page.getByRole('link',{name:'Remove Size: M',exact:true}).click();await page.waitForURL(u=>!u.searchParams.has('size'));await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).searchParams.has('page'),false);assert.equal(new URL(page.url()).searchParams.get('festival'),'diwali');
  await page.goBack({waitUntil:'networkidle'});assert.equal(new URL(page.url()).searchParams.get('size'),'M');
  await go('/shop?sort=price-asc&min=200&max=220');assert.equal(await page.locator('.catalogue-card').count(),2);assert.match(await page.locator('.catalogue-card').first().innerText(),/₹200.45/);
  await go('/shop?availability=out-of-stock');assert.equal(await page.locator('.catalogue-card').count(),1);
  await go('/shop?size=XXXL');await page.getByText('No pieces to show just yet.').waitFor();
  await go('/shop?min=200&max=100');await page.getByText('Let’s adjust those filters.').waitFor();
  await go('/shop?page=999');await page.getByRole('link',{name:'Back to page 1'}).waitFor();
  await go('/shop');await page.locator('.filter-panel summary').click();await page.getByLabel('Search the collection').fill('reference');await page.getByRole('button',{name:'Search collection',exact:true}).click();await page.waitForLoadState('networkidle');assert.equal(await page.locator('.catalogue-card').count(),1);
  await page.getByRole('searchbox',{name:'Search outfits, costumes and accessories'}).fill('nomatch');await page.getByRole('button',{name:'Search catalogue',exact:true}).click();await page.waitForLoadState('networkidle');await page.getByText('No pieces to show just yet.').waitFor();
  await page.getByRole('searchbox',{name:'Search outfits, costumes and accessories'}).fill('reference');await page.getByRole('searchbox',{name:'Search outfits, costumes and accessories'}).press('Enter');await page.waitForLoadState('networkidle');await page.locator('.catalogue-card a').click();await page.waitForURL('**/products/qa-reference-shirt');await page.waitForLoadState('networkidle');
  await page.getByRole('heading',{name:'QA fixture — reference shirt',exact:true}).waitFor();
  const actionBounds=await page.getByRole('button',{name:'Ordering unavailable',exact:true}).boundingBox();assert.ok(actionBounds.y+actionBounds.height<900,'Primary status is visible in first viewport');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),`${base}/products/qa-reference-shirt`);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
  assert.ok(await page.locator('meta[property="og:image"]').count());
  await page.getByRole('button',{name:'View photograph 2'}).click();assert.equal(await page.getByRole('button',{name:'View photograph 2'}).getAttribute('aria-pressed'),'true');
  const small=page.getByRole('radio',{name:/^S Reference colour Low stock/});await small.check();
  await page.getByRole('button',{name:'Increase quantity'}).click();assert.equal(await page.getByRole('button',{name:'Increase quantity'}).isDisabled(),true);
  assert.equal(await page.getByRole('radio',{name:/^XS /}).isDisabled(),true);
  await page.getByRole('button',{name:'Decrease quantity'}).click();assert.equal(await page.getByRole('button',{name:'Decrease quantity'}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Ordering unavailable',exact:true}).isDisabled(),true);
  await small.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('radio',{name:/^M Reference colour/}).isChecked(),true);
  assert.equal(await page.locator('.variant-option:has(:focus-visible)').count(),1);
  assert.ok(await page.locator('.related-products .catalogue-card').count());
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.gallery-main img')).transitionDuration),'0s');
  await shot('product');
  for(const slug of ['qa-demo','qa-inactive','qa-category-inactive','missing']){await go(`/products/${slug}`);await page.getByRole('heading',{name:'This piece isn’t available.'}).waitFor();}
  await go('/products/qa-piece-2');assert.equal(await page.locator('input[name=variant]:enabled').count(),0);await page.getByText('This product is currently unavailable.',{exact:true}).waitFor();
  await go('/products/qa-piece-3');await page.locator('.gallery-main .catalogue-image-empty').waitFor();await shot('missing-photo');
  for(const [asset,status] of [['valid',200],['expired',200],['inaccessible',404],['malformed',404],['corrupt',404]]){assetMode=asset;const r=await page.request.get(`${base}/catalogue-image/${images[0].id}`);assert.equal(r.status(),status,asset);assert.match(r.headers()['cache-control'],/no-store/);assert.equal(r.headers()['x-content-type-options'],'nosniff');}
  assetMode='inaccessible';await go('/products/qa-reference-shirt');await page.locator('.gallery-main .catalogue-image-empty').waitFor();await shot('inaccessible-photo');
  assert.equal((await page.request.get(`${base}/catalogue-image/not-an-id`)).status(),404);
  const demoImage=images.find(i=>i.product_id===id(101));assert.equal((await page.request.get(`${base}/catalogue-image/${demoImage.id}`)).status(),404);
  assetMode='valid';mode='failure';await go('/shop');await page.getByText('We couldn’t load the catalogue.').waitFor();await go('/products/qa-reference-shirt');await page.getByRole('heading',{name:'We couldn’t load this product.'}).waitFor();
  mode='empty';await go('/shop');await shot('empty');assert.equal(await page.locator('.catalogue-card').count(),0);
  mode='ready';await go('/shop');await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Enter');assert.equal(await page.locator('#main-content').evaluate(el=>el===document.activeElement),true);
  assert.deepEqual(errors,[]);
  reports.push({width,filters:'passed',pagination:'passed',productStates:'passed',imageCases:'passed',keyboard:'passed',reducedMotion:'passed',realSupabaseRLS:'NOT VERIFIED'});await page.close();
 }
 assert.ok(requests.some(r=>r.path.endsWith('/product_variants')&&new URLSearchParams(r.query).get('offset')==='100'&&new URLSearchParams(r.query).has('product_id')),'Child pagination tested beyond API row cap');
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
} catch(error){fs.writeFileSync(path.join(output,'test-server.log'),appOutput);throw error;} finally{
 await browser?.close();if(app&&app.exitCode===null){if(process.platform==='win32')await new Promise(resolve=>{const stop=spawn('taskkill',['/pid',String(app.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});stop.on('close',resolve);});else app.kill('SIGTERM');}await new Promise(resolve=>mock.close(resolve));
}
