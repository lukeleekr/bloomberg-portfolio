"use client";
import React, { useState, useEffect, useCallback } from 'react';
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
  const [messages, setMessages] = useState<{id: string, name: string, date: string, msg: string}[]>([]);
  const [myMsgIds, setMyMsgIds] = useState<Set<string>>(new Set());
  const [showAlert, setShowAlert] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [activeBtn, setActiveBtn] = useState('96');
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const scrollLockRef = React.useRef(false);

  // Active tab tracking via scroll position
  useEffect(() => {
    const sectionIds = ['profile', 'skills', 'projects', 'now', 'toolbox', 'journey', 'guestbook', 'contact'];

    const handleScroll = () => {
      // Skip scroll-based detection while a click-initiated scroll is in progress
      if (scrollLockRef.current) return;

      const windowHeight = window.innerHeight;
      const distFromBottom = document.documentElement.scrollHeight - window.scrollY - windowHeight;
      const atBottom = distFromBottom < 10;

      // Near bottom: progressively increase threshold so lower sections activate
      let threshold = 120;
      if (distFromBottom < 800) {
        const proximity = 1 - distFromBottom / 800;
        threshold = 120 + windowHeight * 0.7 * proximity;
      }

      let current = 'profile';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          current = id;
        }
      }

      // At the very bottom, ensure contact (last section) activates
      if (atBottom) current = 'contact';
      // Near bottom but not at bottom: if contact would win over guestbook (side-by-side),
      // prefer guestbook since user hasn't scrolled to absolute bottom
      if (!atBottom && current === 'contact') {
        const gb = document.getElementById('guestbook');
        const ct = document.getElementById('contact');
        if (gb && ct && Math.abs(gb.getBoundingClientRect().top - ct.getBoundingClientRect().top) < 10) {
          current = 'guestbook';
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

  // Close actions dropdown on outside click
  useEffect(() => {
    if (!showActions) return;
    const close = () => setShowActions(false);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [showActions]);

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
    const ownIds = localStorage.getItem('bb_my_msgs');
    if (ownIds) setMyMsgIds(new Set(JSON.parse(ownIds)));
  }, []);

  const handleGuestbookSubmit = () => {
    if (!guestbookName || !guestbookMsg) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newMsg = {
      id,
      name: guestbookName,
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
      msg: guestbookMsg
    };
    const updated = [newMsg, ...messages].slice(0, 50);
    setMessages(updated);
    localStorage.setItem('bb_guestbook', JSON.stringify(updated));
    const newMyIds = new Set(myMsgIds).add(id);
    setMyMsgIds(newMyIds);
    localStorage.setItem('bb_my_msgs', JSON.stringify([...newMyIds]));
    setGuestbookName("");
    setGuestbookMsg("");
  };

  const handleGuestbookDelete = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    localStorage.setItem('bb_guestbook', JSON.stringify(updated));
  };

  // Navigate to section: sets tab immediately and locks scroll detection during animation
  const navigateTo = (id: string) => {
    setActiveTab(id);
    scrollLockRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => { scrollLockRef.current = false; }, 800);
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
        <div className="hidden md:flex items-center gap-4 text-xs relative">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { setActiveBtn('96'); setShowActions(!showActions); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '96' && showActions ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>96) Actions</button>
            <button type="button" onClick={() => { setActiveBtn('97'); window.print(); setShowActions(false); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '97' ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>97) Print</button>
            <button type="button" onClick={() => { setActiveBtn('98'); window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' })); setShowActions(false); }} className={`px-2 cursor-pointer font-bold border ${activeBtn === '98' ? 'bg-bb-orange text-bb-black border-bb-orange' : 'border-bb-border text-bb-gray hover:border-bb-orange hover:text-bb-orange'}`}>98) Terminal</button>
          </div>
          <div className="text-bb-white font-bold w-20 text-right flicker-target">{timeKST}</div>
          {/* 96) Actions Dropdown */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="fixed right-4 top-10 border border-bb-orange bg-bb-black shadow-[0_0_10px_#FF6600] z-50 min-w-[240px]"
              >
                <div className="px-3 py-1 bg-[#1a0f00] border-b border-bb-orange text-bb-orange font-bold text-[10px]">{'>>'} QUICK ACTIONS</div>
                <div className="p-1">
                  {[
                    { label: 'Go to Top', action: () => { navigateTo('profile'); }, key: 'HOME' },
                    { label: 'View Projects', action: () => { navigateTo('projects'); }, key: '3' },
                    { label: 'Print Page', action: () => { window.print(); }, key: 'P' },
                    { label: 'Open Terminal', action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' })), key: '/' },
                    { label: 'Contact Info', action: () => { navigateTo('contact'); }, key: '8' },
                  ].map((item, i) => (
                    <div key={i} onClick={() => { item.action(); setShowActions(false); }} className="flex justify-between px-2 py-1.5 hover:bg-[#1a0f00] cursor-pointer text-bb-white hover:text-bb-orange transition-colors">
                      <span>{item.label}</span>
                      <span className="text-bb-gray text-[10px] border border-bb-border px-1">{item.key}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1 border-t border-bb-border text-[10px] text-bb-gray">KEYBOARD: Press 1-8 to navigate sections</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <nav className="flex overflow-x-auto border-b border-bb-border bg-bb-black sticky top-[33px] md:top-8 z-30 scrollbar-hide">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            onClick={() => navigateTo(tab.id)}
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
              <p className="text-bb-gray text-xs leading-relaxed mb-2">
                14살에 <span className="text-bb-white">호주 퍼스</span>로 이주. 고등학교를 마치고 <span className="text-bb-white">멜버른</span>으로 이동, University of Melbourne에서 회계·금융을 전공. 이후 <span className="text-bb-white">UPenn MCIT</span>에서 컴퓨터공학 석사를 취득. 첫 직장에서 <span className="text-bb-white">10년간</span> 한 번도 이직하지 않고 FX, Rates, Credit 영역의 Deal Architect로 성장.
              </p>
              <p className="text-bb-gray text-xs leading-relaxed mb-2">
                2026년 1월 <span className="text-bb-white">Claude Code</span>를 만난 후 <span className="text-bb-white">AI 코딩</span>과 <span className="text-bb-white">에이전트 프로그래밍</span>에 깊이 빠져들었습니다. 금융과 AI의 교차점에서 새로운 가능성을 탐구 중.
              </p>
              <p className="text-bb-gray text-xs leading-relaxed mb-4">
                일 외에는 <span className="text-bb-white">기타</span>와 <span className="text-bb-white">노래</span>를 좋아하는 평범한 사람.
              </p>
              <FKeyPanel />
            </div>
            <div className="border-t md:border-t-0 md:border-l border-bb-border pt-4 md:pt-0 md:pl-4 font-mono text-xs">
              <table className="w-full">
                <thead><tr className="border-b border-bb-border text-bb-gray"><th className="text-left font-normal pb-1">FIELD</th><th className="text-right font-normal pb-1">VALUE</th></tr></thead>
                <tbody>
                  <tr><td className="py-1">Title</td><td className="text-right text-bb-white">Executive Director</td></tr>
                  <tr><td className="py-1">Location</td><td className="text-right text-bb-white">Seoul, Korea</td></tr>
                  <tr><td className="py-1">Experience</td><td className="text-right text-bb-white"><span className="flicker-target">10</span>+ years</td></tr>
                  <tr><td className="py-1">Domain</td><td className="text-right text-bb-white">Financial Markets</td></tr>
                  <tr><td className="py-1">Coverage</td><td className="text-right text-bb-white">Institutional & Corporate</td></tr>
                  <tr><td className="py-1">Products</td><td className="text-right text-bb-white">FX / Rates / Credit</td></tr>
                  <tr><td className="py-1">Education</td><td className="text-right text-bb-white">UPenn MCIT / Melbourne BCom</td></tr>
                  <tr><td className="py-1">Certifications</td><td className="text-right text-bb-amber">CFA, CAIA, EPAT</td></tr>
                  <tr><td className="py-1">Languages</td><td className="text-right text-bb-white">Korean, English</td></tr>
                  <tr><td className="py-1">AI Start</td><td className="text-right text-bb-white">2026.01</td></tr>
                  <tr><td className="py-1">AI Focus</td><td className="text-right text-bb-orange">Agent Orchestration</td></tr>
                  <tr><td className="py-1">Key Projects</td><td className="text-right text-bb-white flicker-target">8</td></tr>
                  <tr><td className="py-1">Tech Stacks</td><td className="text-right text-bb-white"><span className="flicker-target">5</span>+</td></tr>
                  <tr><td className="py-1">Skills</td><td className="text-right text-bb-white flicker-target">48+</td></tr>
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
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">OS</td><td className="py-1.5 text-right text-bb-white">macOS Sequoia</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Shell</td><td className="py-1.5 text-right text-bb-white">zsh + CMUX</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">AI Runtime</td><td className="py-1.5 text-right text-bb-white">Claude Code v2.1.92</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Primary Model</td><td className="py-1.5 text-right text-bb-orange">Claude Opus 4.6 (1M)</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Secondary</td><td className="py-1.5 text-right text-bb-white">GPT-5.4 (Codex)</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Python</td><td className="py-1.5 text-right text-bb-white">3.12+</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Node.js</td><td className="py-1.5 text-right text-bb-white">v25</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">MCP Servers</td><td className="py-1.5 text-right text-bb-white flicker-target">3 active</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Skills</td><td className="py-1.5 text-right text-bb-white flicker-target">48+ installed</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Local LLM</td><td className="py-1.5 text-right text-bb-white">MLX / Ollama</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Git Commits</td><td className="py-1.5 text-right text-bb-white flicker-target">500+</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Uptime</td><td className="py-1.5 text-right text-bb-white">Since 2026.01</td></tr>
                <tr className="border-b border-bb-border"><td className="py-1.5 text-bb-gray">Sessions/Day</td><td className="py-1.5 text-right text-bb-green flicker-target">8h+</td></tr>
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
                <SkillBar name="Rates & Credit" percent={90} />
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
          <div className="panel-header"><span>{'>>'} PROJECTS DATABASE</span><span className="text-bb-gray text-[10px]">CLICK ROW TO EXPAND</span></div>
          <div className="p-2 overflow-x-auto scrollbar-hide">
            <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex text-bb-gray border-b border-bb-border text-xs px-2 py-1">
              <div className="w-10">NUM</div>
              <div className="w-40">PROJECT</div>
              <div className="w-16">STATUS</div>
              <div className="w-20">PERIOD</div>
              <div className="w-64">TECH STACK</div>
              <div className="flex-1">DESCRIPTION</div>
            </div>
            {/* Rows */}
            <div style={{ perspective: '200px' }}>
                {[
                  { num: "01", name: "COSMOS", status: "LIVE", statusColor: "text-bb-green", period: "2026.01~", tech: "Python, ChromaDB, LLM, Obsidian", desc: "AI 투자 intelligence platform — 4-layer RAG, adversarial debate engine, 일 100K+ 기사 분석, Obsidian knowledge graph", highlight: true,
                    details: [
                      { field: "Architecture", value: "4-layer: Noah RAG → Qwen3 Write Agent → Obsidian Knowledge Graph → Claude Adversarial Debate" },
                      { field: "Core Engine", value: "100K+ articles/day 분석, 구조적 테마 탐지 (6개월+ 호라이즌)" },
                      { field: "RAG Layer", value: "ChromaDB + nomic-embed, daily cron 자동 수집, zero LLM cost" },
                      { field: "Knowledge Graph", value: "Obsidian vault — Signal Notes, Theme Hubs, Conviction Memos, Company Pages (4-node architecture)" },
                      { field: "Debate Engine", value: "Agora: 적대적 투자 논쟁. Luke = Red Team, Athena = Blue Team. 증거 기반 스트레스 테스트" },
                      { field: "Research", value: "PE-grade: DCF, Comparable, LBO, Porter's 5 Forces, Scenario Analysis (Bull/Base/Bear)" },
                      { field: "Impact", value: "실제 투자 의사결정에 사용. Real money at stake — 컴플라이언스가 아닌 생존의 문제" },
                    ],
                    note: "잠들지 않는 애널리스트. COSMOS가 제공하는 인텔리전스, 최종 결정은 항상 내가 한다."
                  },
                  { num: "02", name: "Swarm", status: "LIVE", statusColor: "text-bb-green", period: "2026.03~", tech: "Claude Code, Codex, AutoGen, Shell", desc: "AutoGen 방식 multi-agent orchestration — wave 기반 parallel execution, 3-state verification routing", highlight: false,
                    details: [
                      { field: "Philosophy", value: "AutoGen의 swarm pattern 채택 — manager-orchestrated multi-agent 아키텍처" },
                      { field: "Execution", value: "Wave-based 병렬 실행. 의존성 그래프 기반 task 그룹핑, 사이클 탐지" },
                      { field: "Agents", value: "Pluggable agent registry (YAML). Claude Code + Codex CLI 동시 dispatch" },
                      { field: "Verification", value: "3-state routing: passed → auto-proceed, gaps_found → fix cycle, human_needed → escalate" },
                      { field: "Terminal", value: "CMUX/tmux 자동 감지. 시각적 agent pane + sidebar 상태 표시" },
                    ],
                    note: "복잡한 구현 작업을 여러 AI 에이전트에게 분배하고, 결과를 검증하며, 품질을 보장하는 오케스트레이션 시스템."
                  },
                  { num: "03", name: "Multi-Model Bridge", status: "LIVE", statusColor: "text-bb-green", period: "2026.02~", tech: "Claude, Codex, MCP, TypeScript", desc: "Claude Code + Codex CLI cross-model bridge — MCP protocol 기반 자동 code review, debate, cross-validation", highlight: false,
                    details: [
                      { field: "Purpose", value: "Claude Code ↔ Codex CLI 간 MCP 프로토콜 기반 브릿지" },
                      { field: "Use Case", value: "멀티 모델 코드 리뷰, 디베이트 자동화, 크로스 검증" },
                      { field: "Protocol", value: "File-based messaging + MCP server 통합" },
                      { field: "Cost", value: "Codex: ChatGPT 구독 내 무료 사용" },
                    ],
                    note: "단일 모델의 한계를 넘어, 여러 AI 모델의 강점을 결합하는 워크플로우."
                  },
                  { num: "04", name: "Intelligence Pipeline", status: "LIVE", statusColor: "text-bb-green", period: "2026.02~", tech: "Python, Telegram, RSS, Cron", desc: "자동화된 market signal extraction — 수백 개 source, Daily Brief 생성, Telegram alert, COSMOS knowledge graph 연동", highlight: false,
                    details: [
                      { field: "Sources", value: "RSS feeds, News APIs, YouTube, Research PDFs — 수백 개 소스" },
                      { field: "Processing", value: "자동 수집 → 시그널 추출 → 테마 분류 → Telegram 알림" },
                      { field: "Output", value: "Daily Brief, Weekly Outlook, Signal Alerts" },
                      { field: "Integration", value: "COSMOS Athena 레이어에 피드 — 지식 그래프 자동 업데이트" },
                    ],
                    note: "시장의 노이즈에서 시그널을 추출하는 자동화된 파이프라인."
                  },
                  { num: "05", name: "AlphaWeaver", status: "DEV", statusColor: "text-bb-amber", period: "2025~", tech: "Python, TensorFlow, PyTorch, LLM", desc: "ML + LLM quant trading algorithm — predictive analysis, strategy refinement, backtesting으로 alpha 생성", highlight: false,
                    details: [
                      { field: "Goal", value: "ML + LLM 기반 예측 분석으로 알파 생성" },
                      { field: "Methods", value: "Strategy refinement, backtesting analysis, predictive modeling" },
                      { field: "Stack", value: "TensorFlow/PyTorch for ML, LLMs for qualitative signal integration" },
                    ],
                    note: "금융 전문성과 ML 엔지니어링의 교차점에서 알파를 찾는 사이드 프로젝트."
                  },
                  { num: "06", name: "Pulse", status: "LIVE", statusColor: "text-bb-green", period: "2026.03~", tech: "Python, Reddit, X, YouTube, HN", desc: "7개 source parallel research aggregator — Reddit, X, YouTube, HN, Polymarket 등 무료 API 기반, COSMOS 연동", highlight: false,
                    details: [
                      { field: "Sources", value: "Reddit, X (Twitter), YouTube, Bluesky, Hacker News, Polymarket, Web (Serper/Tavily)" },
                      { field: "Architecture", value: "7개 소스 병렬 검색 → 중복 제거 → 관련성 스코어링 → HTML 리포트 생성" },
                      { field: "Cost Model", value: "유료 API 없이 동작 — 공개 JSON, 쿠키 기반 접근, yt-dlp" },
                      { field: "Integration", value: "--ingest 옵션으로 COSMOS Athena ChromaDB에 자동 피딩" },
                    ],
                    note: "유료 API 없이 7개 소스에서 리서치를 병렬 수행하는 도구. Claude Code skill로 구현."
                  },
                  { num: "07", name: "KakaoTalk Summarizer", status: "LIVE", statusColor: "text-bb-green", period: "2026.03", tech: "Python, LLM, HTML/CSS", desc: "카카오톡 chat export parser — 4가지 input format (CSV/TXT/MD/ZIP), LLM summarization, styled HTML digest 출력", highlight: false,
                    details: [
                      { field: "Input", value: "4가지 포맷 지원: CSV, TXT, MD, ZIP (KakaoTalk 내보내기)" },
                      { field: "Processing", value: "대화 파싱 → LLM 요약 → 핵심 토픽 추출 → 참여자 분석" },
                      { field: "Output", value: "스타일링된 HTML 다이제스트 리포트 (output/ 디렉토리)" },
                    ],
                    note: "바이브랩스 과제로 제작. 카카오톡 대화를 시각적 요약 리포트로 변환."
                  },
                  { num: "08", name: "Bloomberg Portfolio", status: "LIVE", statusColor: "text-bb-green", period: "2026.04", tech: "Next.js, Tailwind, Framer Motion", desc: "이 사이트 — Bloomberg Terminal UI clone. interactive panel, keyboard navigation, mock terminal, Claude Code로 제작", highlight: false,
                    details: [
                      { field: "Design", value: "Bloomberg Terminal UI 완벽 재현 — 실시간 데이터, F-key 패널, 키보드 내비게이션" },
                      { field: "Features", value: "Typewriter, data flicker, radar chart, guestbook, easter egg terminal" },
                      { field: "Built With", value: "Claude Code (AI pair programming) + Gemini (design generation)" },
                    ],
                    note: "AI 코딩으로 만든 포트폴리오. 디자인부터 배포까지 Claude Code와 함께."
                  },
                ].map((p, i) => (
                  <div key={p.num}>
                    <motion.div
                      initial={{ rotateX: 2160 }}
                      whileInView={{ rotateX: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 1.8, delay: 0, ease: [0, 0, 0.3, 1] }}
                      style={{ transformOrigin: "center center" }}
                      onClick={() => setOpenProject(openProject === p.num ? null : p.num)}
                      className={`flex text-xs px-2 py-2 border-b border-bb-border cursor-pointer ${openProject === p.num ? 'bg-[#1a0f00]' : 'hover:bg-[#111]'}`}
                    >
                      <div className="w-10 text-bb-white">{p.num}</div>
                      <div className={`w-40 font-bold ${p.highlight || openProject === p.num ? 'text-bb-orange' : 'text-bb-white'}`}>{p.name}</div>
                      <div className={`w-16 whitespace-nowrap ${p.statusColor}`}><span className="inline-flex items-center"><span className={`w-1.5 h-1.5 mr-1 ${p.status === 'LIVE' ? 'bg-bb-green animate-pulse' : 'bg-bb-amber'}`}/>{p.status}</span></div>
                      <div className="w-20 text-bb-gray">{p.period}</div>
                      <div className="w-64 text-bb-gray">{p.tech}</div>
                      <div className="flex-1 text-bb-white">{p.desc}</div>
                    </motion.div>
                    <AnimatePresence>
                    {openProject === p.num && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-bb-orange bg-[#0a0700] p-3 font-mono overflow-hidden">
                        <table className="w-full text-xs">
                          <tbody>
                            {p.details.map((d, j) => (
                              <tr key={j} className="border-b border-bb-border">
                                <td className="py-1.5 text-bb-amber w-32 align-top">{d.field}</td>
                                <td className="py-1.5 text-bb-white">{d.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 text-bb-gray border-t border-bb-border pt-2">
                          <span className="text-bb-amber">NOTE:</span> {p.note}
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                ))}
            </div>
            </div>
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
                  <td className="py-2 text-bb-white">금융시장 입문. FX, Rates, Credit 영역에서 딜 설계 및 구조화. 기관투자자 및 기업 커버리지, 파생상품 솔루션 설계. 10년간 Deal Architect로 성장.</td>
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
                  messages.slice(0, 5).map((m, i) => (
                    <div key={m.id || i} className="mb-2 group/msg">
                      <div className="text-xs text-bb-amber flex justify-between items-center">
                        <span>{m.name} <span className="text-bb-gray ml-2 text-[10px]">{m.date}</span></span>
                        {myMsgIds.has(m.id) && (
                          <button onClick={() => handleGuestbookDelete(m.id)} className="text-bb-gray hover:text-bb-red text-[10px] opacity-0 group-hover/msg:opacity-100 transition-opacity">DEL</button>
                        )}
                      </div>
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
                  <tr><td className="py-2 text-bb-amber">GitHub</td><td className="py-2"><a href="https://github.com/lukeleekr" target="_blank" rel="noopener noreferrer" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">github.com/lukeleekr</a></td></tr>
                  <tr><td className="py-2 text-bb-amber">LinkedIn</td><td className="py-2"><a href="https://www.linkedin.com/in/lukeleekr/" target="_blank" rel="noopener noreferrer" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">linkedin.com/in/lukeleekr</a></td></tr>
                  <tr><td className="py-2 text-bb-amber">Email</td><td className="py-2"><a href="mailto:lukeleekr@gmail.com" className="text-bb-orange hover:text-bb-white underline decoration-bb-border underline-offset-4">lukeleekr@gmail.com</a></td></tr>
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
