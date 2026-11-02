import {createClient} from '@supabase/supabase-js';
import {makeSeed} from './seed';
import {combineManualAndQR} from './operations';
import {quest3Only} from './pricing';
export const KEY='dreamops-production-v5';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud=url&&key?createClient(url,key):null;
export function readLocal(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v?.version===5)return quest3Only(combineManualAndQR(v));}catch{}return makeSeed();}
export function writeLocal(value){localStorage.setItem(KEY,JSON.stringify(value));}
export async function readCloud(){const {data,error}=await cloud.from('dreamops_workspace').select('data,revision').eq('id',1).single();if(error)throw error;data.data=quest3Only(combineManualAndQR(data.data));return data;}
export async function writeCloud(data,revision){const {data:result,error}=await cloud.rpc('save_dreamops_workspace',{expected_revision:revision,new_data:data});if(error)throw error;if(result===null)throw Error('A teammate saved changes first. Your workspace has been refreshed; please repeat your action.');return result;}
export function download(data,filename){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
