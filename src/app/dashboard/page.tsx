import {PurchaseWorkspace} from '@/components/dashboard/PurchaseWorkspace';
export const metadata={title:'Purchase workspace'};
export default async function Page({searchParams}:{searchParams:Promise<{objective?:string}>}){const p=await searchParams;return <PurchaseWorkspace initialObjective={(p.objective??'').slice(0,2000)}/>;}
