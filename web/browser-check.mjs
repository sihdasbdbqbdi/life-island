import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
await page.screenshot({path:'/tmp/life-island-initial.png',fullPage:true});
console.log(JSON.stringify({errors,title:await page.title(),text:(await page.locator('body').innerText()).slice(0,500)}));
await browser.close();
