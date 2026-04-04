"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SkillsRadar from './components/RadarChart';
import TerminalOverlay from './components/TerminalOverlay';
import FKeyPanel from './components/FKeyPanel';
import ToolboxPanel from './components/ToolboxPanel';

const getKSTTime = () => {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul", hour12: false });
};

const isMarketOpen = () => {
  const now = new Date();
  const kstString = now.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  const kst = new Date(kstString);
  const day = kst.getDay();
  const hours = kst.getHours();
  const mins = kst.getMinutes();
  const timeVal = hours * 100 + mins;
  return day >= 1 && day <= 5 && timeVal >= 900 && timeVal <= 1530;
};

const SkillBar = ({ name, percent }: { name: string, percent: number }) => (
  <div className="flex items-center text-xs mb-1">
    <div className="w-32 truncate text-bb-gray">{name}</div>
    <div className="flex-1 h-3 bg-[#222] mx-2 relative border border-[#333]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${percent}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="h-full bg-bb-orange"
      />
    </div>
    <div className="w-8 text-right text-bb-white flicker-target">{percent}%</div>
  </div>
);


export default function BloombergPortfolio() {
  const [timeKST, setTimeKST] = useState<string>("");
  const [marketOpen, setMarketOpen] = useState<boolean>(false);
  const [typewriterText, setTypewriterText] = useState("");
  const fullText = "10년차 금융 전문가, 2026년 1월부터 AI 코딩에 빠지다";

  const [guestbookName, setGuestbookName] = useState("");
  const [guestbookMsg, setGuestbookMsg] = useState("");
  const [messages, setMessages] = useState<{name: string, date: string, msg: string}[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [activeBtn, setActiveBtn] = useState('96');

  // Active tab tracking via scroll position
  useEffect(() => {
    const sectionIds = ['profile', 'skills', 'projects', 'now', 'toolbox', 'journey', 'guestbook', 'contact'];

    const handleScroll = () => {
      let current = 'profile';

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // Section is "active" when its top is at or above 120px from viewport top
        if (rect.top <= 120) {
          current = id;
        }
      }
      setActiveTab(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Time & Market Status
  useEffect(() => {
    setTimeKST(getKSTTime().split(', ')[1]);
    setMarketOpen(isMarketOpen());
    const timer = setInterval(() => {
      setTimeKST(getKSTTime().split(', ')[1]);
      setMarketOpen(isMarketOpen());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Typewriter
  useEffect(() => {
    let currentLength = 0;
    const typeInterval = setInterval(() => {
      if (currentLength <= fullText.length) {
        setTypewriterText(fullText.slice(0, currentLength));
        currentLength++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);
    return () => clearInterval(typeInterval);
  }, []);

  // Data Flicker Effect
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      const targets = document.querySelectorAll('.flicker-target');
      if (targets.length === 0) return;
      const numToFlicker = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numToFlicker; i++) {
        const randomEl = targets[Math.floor(Math.random() * targets.length)];
        randomEl.classList.add('animate-flicker');
        setTimeout(() => randomEl.classList.remove('animate-flicker'), 300);
      }
    }, 6000);
    return () => clearInterval(flickerInterval);
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const sectionMap: Record<string, string> = {
        '1': 'profile', '2': 'skills', '3': 'projects', '4': 'now',
        '5': 'toolbox', '6': 'journey', '7': 'guestbook', '8': 'contact'
      };

      if (sectionMap[e.key]) {
        e.preventDefault();
        document.getElementById(sectionMap[e.key])?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bloomberg Popup Alert
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionStorage.getItem('bb_alert_seen')) {
      const showTimer = setTimeout(() => {
        setShowAlert(true);
        sessionStorage.setItem('bb_alert_seen', 'true');
      }, 5000);
      const hideTimer = setTimeout(() => setShowAlert(false), 10000);
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }
  }, []);

  // Guestbook
  useEffect(() => {
    const saved = localStorage.getItem('bb_guestbook');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  const handleGuestbookSubmit = () => {
    if (!guestbookName || !guestbookMsg) return;
    const newMsg = {
      name: guestbookName,
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
      msg: guestbookMsg
    };
    const updated = [newMsg, ...messages].slice(0, 50);
    setMessages(updated);
    localStorage.setItem('bb_guestbook', JSON.stringify(updated));
    setGuestbookName("");
    setGuestbookMsg("");
  };

  const tabs = [
    { label: '1) Profile', id: 'profile' },
    { label: '2) Skills', id: 'skills' },
    { label: '3) Projects', id: 'projects' },
    { label: '4) Now', id: 'now' },
    { label: '5) Toolbox', id: 'toolbox' },
    { label: '6) Journey', id: 'journey' },
    { label: '7) Guestbook', id: 'guestbook' },
    { label: '8) Contact', id: 'contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <TerminalOverlay />

      {/* Alert Popup */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 z-50 border-2 border-bb-orange bg-bb-black p-3 shadow-[0_0_15px_#FF6600] cursor-pointer"
            onClick={() => setShowAlert(false)}
          >
            <div className="text-bb-amber font-bold text-xs mb-1 border-b border-bb-border pb-1">{'>>'} SYSTEM MESSAGE</div>
            <div className="text-bb-white text-sm">Press <span className="text-bb-orange bg-[#222] px-1 border border-bb-border">/</span> to open terminal</div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-bb-border flex flex-col md:flex-row md:items-center justify-between px-2 py-1 bg-bb-black sticky top-0 z-40">
        <div className="flex items-center gap-4 justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="text-bb-amber font-bold">PORTFOLIO</div>
            <div className="text-bb-white border-l border-bb-border pl-2">이용훈 / Luke Lee</div>
          </div>
          <div className="text-bb-white font-bold text-right md:hidden flicker-target">{timeKST}</div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { setActiveBtn('96'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '96' ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>96) Actions</button>
            <button type="button" onClick={() => { setActiveBtn('97'); document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '97' ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>97) Output</button>
            <button type="button" onClick={() => { setActiveBtn('98'); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '98' ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>98) Settings</button>
          </div>
          <div className="text-bb-white font-bold w-20 text-right flicker-target">{timeKST}</div>
        </div>
      </header>

      <nav className="flex overflow-x-auto border-b border-bb-border bg-bb-black sticky top-[33px] md:top-8 z-30 scrollbar-hide">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-4 py-1 text-xs border-r border-bb-border whitespace-nowrap cursor-pointer hover:text-bb-orange transition-colors ${activeTab === tab.id ? 'bg-bb-orange text-bb-black font-bold hover:text-bb-black' : 'text-bb-gray'}`}
          >
            {tab.label}
          </div>
        ))}
      </nav>

      <main className="p-2 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 text-sm max-w-[1600px] mx-auto w-full">

        {/* 1) PROFILE */}
        <motion.section id="profile" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-8 flex flex-col scroll-mt-20">
          <div className="panel-header"><span>{'>>'} PROFILE</span></div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <div>
              <h1 className="text-bb-orange text-2xl font-bold mb-1">이용훈 / Luke Lee</h1>
              <div className="text-bb-amber mb-2">Financial Markets Professional × Aspiring AI Engineer</div>
              <div className="h-6 mb-4 text-bb-white">
                {typewriterText}<span className="cursor-blink text-bb-orange">|</span>
              </div>
              <p className="text-bb-gray text-xs leading-relaxed mb-4">
                10년차 금융 시장 전문가. <span className="text-bb-white">FX</span>, <span className="text-bb-white">크레딧</span>, <span className="text-bb-white">DCM</span> 영역에서 딜을 설계해왔고, 2026년 1월 <span className="text-bb-white">Claude Code</span>를 만난 후 <span className="text-bb-white">AI 코딩</span>과 <span className="text-bb-white">에이전트 프로그래밍</span>에 깊이 빠져들었습니다.
              </p>
              <FKeyPanel />
            </div>
            <div className="border-t md:border-t-0 md:border-l border-bb-border pt-4 md:pt-0 md:pl-4 font-mono text-xs">
              <table className="w-full">
                <thead><tr className="border-b border-bb-border text-bb-gray"><th className="text-left font-normal pb-1">FIELD</th><th className="text-right font-normal pb-1">VALUE</th></tr></thead>
                <tbody>
                  <tr><td className="py-1">Experience</td><td className="text-right text-bb-white"><span className="flicker-target">10</span>+ years</td></tr>
                  <tr><td className="py-1">Domain</td><td className="text-right text-bb-white">Financial Markets</td></tr>
                  <tr><td className="py-1">AI Start</td><td className="text-right text-bb-white">2026.01</td></tr>
                  <tr><td className="py-1">Key Projects</td><td className="text-right text-bb-white flicker-target">3</td></tr>
                  <tr><td className="py-1">Tech Stacks</td><td className="text-right text-bb-white"><span className="flicker-target">5</span>+</td></tr>
                  <tr><td className="py-1">Status</td><td className="text-right text-bb-green"><span className="inline-flex items-center"><span className="w-2 h-2 bg-bb-green mr-1 animate-pulse" /> ACTIVE</span></td></tr>
                  <tr><td className="py-1">Market (KRX)</td><td className={`text-right ${marketOpen ? 'text-bb-green' : 'text-bb-red'}`}><span className="inline-flex items-center"><span className={`w-2 h-2 mr-1 ${marketOpen ? 'bg-bb-green animate-pulse' : 'bg-bb-red'}`} /> {marketOpen ? 'OPEN' : 'CLOSED'}</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* SYSTEM STATUS */}
        <motion.section id="system-status" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-4 flex flex-col scroll-mt-20">
          <div className="panel-header">
            <span>{'>>'} SYSTEM STATUS</span>
            <span className="text-bb-green flex items-center text-xs"><span className="w-1.5 h-1.5 bg-bb-green mr-1 animate-pulse" />ONLINE</span>
          </div>
          <div className="p-3 text-xs flex-1 font-mono">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray w-1/3">Environment</td><td className="py-1.5 text-right text-bb-white">M3 Ultra (96GB RAM)</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">OS</td><td className="py-1.5 text-right text-bb-white">macOS</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Shell</td><td className="py-1.5 text-right text-bb-white">zsh</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">AI Runtime</td><td className="py-1.5 text-right text-bb-white">Claude Code v1.x</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Models</td><td className="py-1.5 text-right text-bb-white">Claude Opus / GPT-5.4</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Uptime</td><td className="py-1.5 text-right text-bb-white">Since 2026.01</td></tr>
                <tr><td className="py-1.5 text-bb-gray">Last Deploy</td><td className="py-1.5 text-right text-bb-white flicker-target">2026.04.04</td></tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* 2) SKILLS */}
        <motion.section id="skills" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-12 flex flex-col scroll-mt-20">
          <div className="panel-header"><span>{'>>'} SKILLS ANALYSIS</span></div>
          <div className="p-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="col-span-1 border border-bb-border p-2 min-h-[250px]">
              <SkillsRadar />
            </div>
            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-bb-border p-2">
                <div className="text-bb-amber mb-2 text-xs border-b border-bb-border pb-1">FINANCE</div>
                <SkillBar name="FX & Derivatives" percent={95} />
                <SkillBar name="Credit & DCM" percent={90} />
                <SkillBar name="Deal Structuring" percent={90} />
                <SkillBar name="Macro Analysis" percent={85} />
              </div>
              <div className="border border-bb-border p-2">
                <div className="text-bb-amber mb-2 text-xs border-b border-bb-border pb-1">AI / ML</div>
                <SkillBar name="Claude Code / Codex" percent={95} />
                <SkillBar name="LLM Orchestration" percent={90} />
                <SkillBar name="RAG Systems" percent={90} />
                <SkillBar name="Prompt Engineering" percent={85} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* 3) PROJECTS */}
        <motion.section id="projects" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-12 flex flex-col scroll-mt-20">
          <div className="panel-header"><span>{'>>'} PROJECTS DATABASE</span></div>
          <div className="p-2 overflow-x-auto scrollbar-hide">
            <table className="w-full text-xs text-left whitespace-nowrap min-w-[800px]">
              <thead className="text-bb-gray border-b border-bb-border">
                <tr>
                  <th className="px-2 py-1 font-normal">NUM</th>
                  <th className="px-2 py-1 font-normal">PROJECT</th>
                  <th className="px-2 py-1 font-normal">STATUS</th>
                  <th className="px-2 py-1 font-normal">TECH STACK</th>
                  <th className="px-2 py-1 font-normal w-full">DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { num: "01", name: "COSMOS", tech: "Python/RAG/LLM/VectorDB", desc: "AI 기반 투자 의사결정 인텔리전스 시스템" },
                  { num: "02", name: "Multi-Model Bridge", tech: "Claude/Codex/MCP/TS", desc: "Claude + GPT 브릿지 및 워크플로우 엔진" },
                  { num: "03", name: "Intelligence Pipeline", tech: "Python/Telegram/RSS", desc: "대규모 시장 데이터 소스 시그널 추출 시스템" }
                ].map((p, i) => (
                  <motion.tr key={p.num} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="border-b border-bb-border hover:bg-[#111] cursor-pointer group">
                    <td className="px-2 py-2 text-bb-white">{p.num}</td>
                    <td className="px-2 py-2 text-bb-orange group-hover:text-bb-amber transition-colors font-bold underline decoration-bb-border decoration-dashed underline-offset-4">{p.name}</td>
                    <td className="px-2 py-2 text-bb-green whitespace-nowrap"><span className="inline-flex items-center"><span className="w-1.5 h-1.5 bg-bb-green mr-1 animate-pulse"/>LIVE</span></td>
                    <td className="px-2 py-2 text-bb-gray">{p.tech}</td>
                    <td className="px-2 py-2 text-bb-white">{p.desc}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* 4) NOW & 5) TOOLBOX */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-2">
          <motion.section id="now" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 flex flex-col scroll-mt-20">
            <div className="panel-header"><span>{'>>'} NOW</span></div>
            <div className="p-3 text-xs flex-1 flex flex-col justify-between">
              <ul className="space-y-3 mb-4">
                <li className="flex"><span className="text-bb-orange mr-2">◆</span><span className="text-bb-white">Agent Programming 입문 — harness engineering 집중 학습</span></li>
                <li className="flex"><span className="text-bb-orange mr-2">◆</span><span className="text-bb-white">Claude Code 성능 최적화 워크플로우 개선</span></li>
                <li className="flex"><span className="text-bb-orange mr-2">◆</span><span className="text-bb-white">COSMOS 아키텍처 스케일링</span></li>
              </ul>
              <div className="border-t border-bb-border pt-2 text-bb-amber text-center font-bold">
                TARGET: Agent Orchestration 마스터
              </div>
            </div>
          </motion.section>

          <motion.section id="toolbox" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-2 flex flex-col scroll-mt-20">
            <div className="panel-header"><span>{'>>'} TOOLBOX MATRIX</span></div>
            <ToolboxPanel />
          </motion.section>
        </div>

        {/* 6) JOURNEY */}
        <motion.section id="journey" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 lg:col-span-12 flex flex-col scroll-mt-20">
          <div className="panel-header"><span>{'>>'} LEARNING JOURNEY</span></div>
          <div className="p-4">
            {/* Timeline as table — no cutoff issues */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bb-border text-bb-gray">
                  <th className="text-left font-normal py-1 w-24">PERIOD</th>
                  <th className="text-left font-normal py-1 w-40">PHASE</th>
                  <th className="text-left font-normal py-1">DETAILS</th>
                  <th className="text-right font-normal py-1 w-20">STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-bb-border">
                  <td className="py-2 text-bb-amber font-bold">2016 ~</td>
                  <td className="py-2 text-bb-orange font-bold">Finance Expert</td>
                  <td className="py-2 text-bb-white">금융시장 입문. FX, Credit, DCM 영역에서 딜 설계 및 구조화. 기관투자자 커버리지, Cross-border 자금 흐름 설계. 10년간 Deal Architect로 성장.</td>
                  <td className="py-2 text-right text-bb-white">COMPLETE</td>
                </tr>
                <tr className="border-b border-bb-border">
                  <td className="py-2 text-bb-amber font-bold">2026.01</td>
                  <td className="py-2 text-bb-orange font-bold">AI 코딩 입문</td>
                  <td className="py-2 text-bb-white">Claude Code와의 첫 만남. Python 학습 시작. 3개월 만에 COSMOS, Multi-Model Bridge, Intelligence Pipeline 구축. AI 코딩의 가능성에 눈을 뜸.</td>
                  <td className="py-2 text-right text-bb-white">COMPLETE</td>
                </tr>
                <tr className="border-b border-bb-border">
                  <td className="py-2 text-bb-amber font-bold">2026.04</td>
                  <td className="py-2 text-bb-orange font-bold">Agent Programming</td>
                  <td className="py-2 text-bb-white">Harness Engineering과 Agent Orchestration 집중 학습. Claude Code 워크플로우 최적화. 멀티 에이전트 시스템 설계 및 MCP 프로토콜 탐구.</td>
                  <td className="py-2 text-right"><span className="inline-flex items-center text-bb-green"><span className="w-1.5 h-1.5 bg-bb-green mr-1 animate-pulse"/>ACTIVE</span></td>
                </tr>
                <tr>
                  <td className="py-2 text-bb-gray">NEXT</td>
                  <td className="py-2 text-bb-gray">Open Source 기여</td>
                  <td className="py-2 text-bb-gray">Claude Code 성능 최적화 기여. 금융 × AI 도메인의 오픈소스 도구 개발.</td>
                  <td className="py-2 text-right text-bb-gray">PLANNED</td>
                </tr>
              </tbody>
            </table>
            {/* Progress bar */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-bb-gray text-[10px]">PROGRESS</span>
              <div className="flex-1 h-2 bg-bb-border">
                <motion.div initial={{ width: 0 }} whileInView={{ width: '65%' }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-bb-orange" />
              </div>
              <span className="text-bb-orange text-[10px] font-bold">65%</span>
            </div>
          </div>
        </motion.section>

        {/* 7) GUESTBOOK & 8) CONTACT */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-2">
          <motion.section id="guestbook" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 flex flex-col scroll-mt-20">
            <div className="panel-header"><span>{'>>'} GUESTBOOK</span></div>
            <div className="p-3 flex flex-col sm:flex-row gap-4 flex-1">
              <div className="w-full sm:w-1/2 flex flex-col gap-2">
                <input type="text" placeholder="NAME: [____]" value={guestbookName} onChange={e => setGuestbookName(e.target.value)} className="bg-bb-black border border-bb-border text-bb-white text-xs p-1 outline-none focus:border-bb-orange" />
                <textarea placeholder="MSG: [____]" value={guestbookMsg} onChange={e => setGuestbookMsg(e.target.value)} className="bg-bb-black border border-bb-border text-bb-white text-xs p-1 outline-none focus:border-bb-orange resize-none h-16" />
                <button onClick={handleGuestbookSubmit} className="bg-bb-orange text-bb-black text-xs font-bold py-1 hover:bg-[#cc5200] transition-colors border-none">SUBMIT</button>
              </div>
              <div className="w-full sm:w-1/2 border-t sm:border-t-0 sm:border-l border-bb-border pt-2 sm:pt-0 sm:pl-4 overflow-y-auto max-h-32 scrollbar-hide">
                <div className="text-bb-gray text-[10px] mb-2 border-b border-bb-border pb-1">RECENT MESSAGES</div>
                {messages.length === 0 ? (
                  <div className="text-bb-gray text-xs italic">No messages yet.</div>
                ) : (
                  messages.slice(0, 3).map((m, i) => (
                    <div key={i} className="mb-2">
                      <div className="text-xs text-bb-amber">{m.name} <span className="text-bb-gray ml-2 text-[10px]">{m.date}</span></div>
                      <div className="text-xs text-bb-white">{m.msg}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>

          <motion.section id="contact" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-bb col-span-1 flex flex-col scroll-mt-20">
            <div className="panel-header"><span>{'>>'} CONTACT DIRECTORY</span></div>
            <div className="p-3 text-xs flex-1 font-mono">
              <table className="w-full text-left">
                <thead><tr className="border-b border-bb-border text-bb-gray"><th className="pb-1 font-normal">FIELD</th><th className="pb-1 font-normal">LINK</th></tr></thead>
                <tbody>
                  <tr><td className="py-2 text-bb-amber">GitHub</td><td className="py-2"><a href="#" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">github.com/lukeleekr</a></td></tr>
                  <tr><td className="py-2 text-bb-amber">LinkedIn</td><td className="py-2"><a href="#" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">linkedin.com/in/luke-lee</a></td></tr>
                  <tr><td className="py-2 text-bb-amber">Email</td><td className="py-2"><a href="#" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">hello@cosmos-ai.dev</a></td></tr>
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
      </main>

      {/* Ticker Footer */}
      <footer className="fixed bottom-0 w-full z-40 bg-bb-black">
        <div className="bg-bb-orange text-bb-black text-center text-[10px] py-0.5 font-bold border-t border-bb-border">
          Financial Markets Professional × Aspiring AI Engineer
        </div>
        <div className="bg-bb-darkgray border-t border-b border-bb-border text-bb-orange text-xs py-1 flex overflow-hidden whitespace-nowrap relative">
          <div className="animate-ticker inline-block">
            FX &amp; Derivatives ▲ | Credit Structuring ▲ | Python ▲ | LLM Orchestration ▲ | RAG Systems ▲ | Macro Analysis ▲ | COSMOS AI ▲ |
            FX &amp; Derivatives ▲ | Credit Structuring ▲ | Python ▲ | LLM Orchestration ▲ | RAG Systems ▲ | Macro Analysis ▲ | COSMOS AI ▲
          </div>
        </div>
      </footer>
    </div>
  );
}
