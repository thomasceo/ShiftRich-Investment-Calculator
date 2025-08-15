
import React, { useMemo, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const usd = (n:number)=> new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number.isFinite(n)?n:0);
const toNum=(v:any,d=0)=>{const n=Number(String(v).replace(/[^0-9.-]/g,""));return Number.isFinite(n)?n:d;}
const pmt=(r:number,n:number,p:number)=>{r/=12;return r===0?p/n:(r*p)/(1-Math.pow(1+r,-n));};

type UI={'tab':"REHAB"|"RESELL"|"RENTAL",'simple':boolean}
type State={ui:UI,shared:{sqft:number},rehab:{budget:number,perSqft:number},resell:{purchasePrice:number,months:number,arv:number},rental:{monthlyRent:number,mortgage:{years:number,downPct:number,rate:number},pmPct:number,annualTaxes:number,insuranceMo:number,maintPerSqftYr:number,vacancyPctOfRent:number,holdYears:number,appreciation:number,rentInflation:number,hoaMo:number}}

const defaults:State={ui:{tab:"RESELL",simple:true},shared:{sqft:1811},rehab:{budget:0,perSqft:50},resell:{purchasePrice:300000,months:5,arv:360000},rental:{monthlyRent:1850,mortgage:{years:30,downPct:20,rate:7.2},pmPct:8,annualTaxes:2200,insuranceMo:80,maintPerSqftYr:1.2,vacancyPctOfRent:5,holdYears:30,appreciation:3,rentInflation:3,hoaMo:0}}

export default function App(){
  const [st,setSt]=useState<State>(()=>{try{const raw=localStorage.getItem("sr_calc");return raw?JSON.parse(raw):defaults;}catch{return defaults}});
  const save=()=>localStorage.setItem("sr_calc",JSON.stringify(st));
  const pdfRef=useRef<HTMLDivElement>(null);
  const rehabBudget=st.rehab.budget||st.rehab.perSqft*st.shared.sqft;

  const flip=useMemo(()=>{
    const title=st.resell.purchasePrice*0.0033+550;
    const ins=st.resell.arv*0.004*st.resell.months/12;
    const utils=135*st.resell.months;
    const taxes=st.rental.annualTaxes*st.resell.months/12;
    const carry=ins+utils+taxes;
    const sell=st.resell.arv*(0.025+0.025)+550;
    const total=st.resell.purchasePrice+rehabBudget+title+carry+sell;
    return {buy:title,carry,sell,total,profit:st.resell.arv-total}
  },[st,rehabBudget]);

  const rental=useMemo(()=>{
    const P=st.resell.purchasePrice, down=P*(st.rental.mortgage.downPct/100), loan=P-down;
    const mo=-pmt(st.rental.mortgage.rate/100, st.rental.mortgage.years*12, loan);
    const rent=st.rental.monthlyRent, pm=rent*(st.rental.pmPct/100), vac=rent*(st.rental.vacancyPctOfRent/100);
    const maint=st.shared.sqft*st.rental.maintPerSqftYr/12, tax=st.rental.annualTaxes/12, ins=st.rental.insuranceMo, hoa=st.rental.hoaMo;
    const op=pm+vac+maint+tax+ins+hoa, cash=rent-op-mo, noi=(rent*12)-(op*12);
    const cap=noi/P; return {mo, op, cash, cap};
  },[st]);

  const exportPDF=async()=>{const el=pdfRef.current;if(!el)return;const c=await html2canvas(el,{scale:2,backgroundColor:"#fff"});const pdf=new jsPDF({unit:"pt",format:"a4"});const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();const r=Math.min(w/c.width,h/c.height);pdf.addImage(c.toDataURL("image/png"),"PNG",(w-c.width*r)/2,20,c.width*r,c.height*r);pdf.save("ShiftRich_Calculator.pdf")}

  return <div style={{background:"#FBF6EE"}} className="min-h-screen">
    <div ref={pdfRef} className="max-w-6xl mx-auto p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">ShiftRich Investment Calculator</h1>
        <div className="flex gap-2">
          <button className="border px-3 py-2 rounded" onClick={()=>{save();alert('Saved')}}>Save</button>
          <button className="border px-3 py-2 rounded" onClick={()=>{localStorage.removeItem('sr_calc');setSt(defaults)}}>Reset</button>
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={exportPDF}>Export PDF</button>
        </div>
      </header>

      <nav className="flex gap-2 mb-3">
        {(["REHAB","RESELL","RENTAL"] as const).map(t=><button key={t} onClick={()=>setSt({...st,ui:{...st.ui,tab:t}})} className={`px-3 py-1 rounded border ${st.ui.tab===t?'bg-yellow-300 border-yellow-300':''}`}>{t}</button>)}
      </nav>

      {st.ui.tab==="REHAB" && <section className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded border">
        <div>
          <h3 className="font-semibold mb-2">Rehab Budget</h3>
          <label className="block text-sm">Budget ($)<input className="border rounded w-full p-2" type="number" value={st.rehab.budget} onChange={e=>setSt({...st,rehab:{...st.rehab,budget:toNum(e.target.value)}})}/></label>
          <label className="block text-sm mt-2">Per Sqft ($)<input className="border rounded w-full p-2" type="number" value={st.rehab.perSqft} onChange={e=>setSt({...st,rehab:{...st.rehab,perSqft:toNum(e.target.value)}})}/></label>
        </div>
        <div className="space-y-2">
          <div className="p-3 bg-slate-50 rounded border"><div className="text-xs">Current Budget</div><div className="font-semibold">{usd(rehabBudget)}</div></div>
          <div className="p-3 bg-slate-50 rounded border"><div className="text-xs">Per Sqft</div><div className="font-semibold">{usd(rehabBudget/Math.max(1,st.shared.sqft))}/sqft</div></div>
        </div>
      </section>}

      {st.ui.tab==="RESELL" && <section className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded border">
        <div className="space-y-2">
          <label className="block text-sm">Purchase Price<input className="border rounded w-full p-2" type="number" value={st.resell.purchasePrice} onChange={e=>setSt({...st,resell:{...st.resell,purchasePrice:toNum(e.target.value)}})}/></label>
          <label className="block text-sm">Carry Months<input className="border rounded w-full p-2" type="number" value={st.resell.months} onChange={e=>setSt({...st,resell:{...st.resell,months:toNum(e.target.value)}})}/></label>
          <label className="block text-sm">After Repair Value<input className="border rounded w-full p-2" type="number" value={st.resell.arv} onChange={e=>setSt({...st,resell:{...st.resell,arv:toNum(e.target.value)}})}/></label>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Buying Costs</span><b>{usd(flip.buy)}</b></div>
          <div className="flex justify-between"><span>Carrying Costs</span><b>{usd(flip.carry)}</b></div>
          <div className="flex justify-between"><span>Selling Costs</span><b>{usd(flip.sell)}</b></div>
          <div className="border-t my-2"/>
          <div className="flex justify-between"><span>Total Costs</span><b>{usd(flip.total)}</b></div>
          <div className="flex justify-between"><span>Profit</span><b>{usd(flip.profit)}</b></div>
        </div>
      </section>}

      {st.ui.tab==="RENTAL" && <section className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded border">
        <div className="space-y-2">
          <label className="block text-sm">Rent (Monthly)<input className="border rounded w-full p-2" type="number" value={st.rental.monthlyRent} onChange={e=>setSt({...st,rental:{...st.rental,monthlyRent:toNum(e.target.value)}})}/></label>
          <label className="block text-sm">Term (years)<input className="border rounded w-full p-2" type="number" value={st.rental.mortgage.years} onChange={e=>setSt({...st,rental:{...st.rental,mortgage:{...st.rental.mortgage,years:toNum(e.target.value)}}})}/></label>
          <label className="block text-sm">Down Payment (%)<input className="border rounded w-full p-2" type="number" value={st.rental.mortgage.downPct} onChange={e=>setSt({...st,rental:{...st.rental,mortgage:{...st.rental.mortgage,downPct:toNum(e.target.value)}}})}/></label>
          <label className="block text-sm">Interest Rate (%)<input className="border rounded w-full p-2" type="number" value={st.rental.mortgage.rate} onChange={e=>setSt({...st,rental:{...st.rental,mortgage:{...st.rental.mortgage,rate:toNum(e.target.value)}}})}/></label>
        </div>
        <RentalSnapshot state={st} />
      </section>}
    </div>
  </div>
}

function RentalSnapshot({state}:{state:State}){
  const P=state.resell.purchasePrice, down=P*(state.rental.mortgage.downPct/100), loan=P-down;
  const mo=-pmt(state.rental.mortgage.rate/100, state.rental.mortgage.years*12, loan);
  const rent=state.rental.monthlyRent, pm=rent*(state.rental.pmPct/100), vac=rent*(state.rental.vacancyPctOfRent/100);
  const maint=state.shared.sqft*state.rental.maintPerSqftYr/12, tax=state.rental.annualTaxes/12, ins=state.rental.insuranceMo, hoa=state.rental.hoaMo;
  const op=pm+vac+maint+tax+ins+hoa, cash=rent-op-mo, noi=(rent*12)-(op*12), cap=noi/P;

  return <div className="space-y-1 text-sm">
    <div className="flex justify-between"><span>Monthly Rent</span><b>{usd(rent)}</b></div>
    <div className="flex justify-between"><span>Expenses</span><b>{usd(op)}</b></div>
    <div className="flex justify-between"><span>Mortgage</span><b>{usd(mo)}</b></div>
    <div className="border-t my-2"/>
    <div className="flex justify-between"><span>Cash Flow</span><b style={{color: cash>=0?'#059669':'#dc2626'}}>{usd(cash)}</b></div>
    <div className="flex justify-between"><span>Cap Rate</span><b>{(cap*100).toFixed(2)}%</b></div>
  </div>
}
