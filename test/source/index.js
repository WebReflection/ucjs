import {some, stuff} from 'test';

console.log(some, stuff);

console.log(import.meta.url);

import('test').then(console.log);

async function test(value) { return import(value); }
