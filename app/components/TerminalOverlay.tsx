"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TerminalOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{cmd: string, output: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === '`') && !isOpen) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input.trim().toLowerCase();
      let output = '';

      switch(cmd) {
        case 'help': output = 'Commands: whoami, cat about, ls skills, ls projects, clear, exit'; break;
        case 'whoami': output = '이용훈 / Luke Lee — Financial Markets Professional × Aspiring AI Engineer'; break;
        case 'cat about': output = '10년차 금융 시장 전문가. FX, 크레딧, DCM 영역에서 딜을 설계해왔고,\n2026년 1월 Claude Code를 만난 후 AI 코딩과 에이전트 프로그래밍에\n깊이 빠져들었습니다.'; break;
        case 'ls skills': output = 'drwxr-xr-x  finance/\n  ├── fx-derivatives\n  ├── credit-structuring\n  ├── dcm\n  ├── macro-analysis\n  └── cross-border-flows\n\ndrwxr-xr-x  tech/\n  ├── python\n  ├── llm-orchestration\n  ├── rag-systems\n  ├── data-pipelines\n  └── system-architecture'; break;
        case 'ls projects': output = 'COSMOS/          — AI 투자 인텔리전스 시스템\nmulti-model/     — Claude + GPT 브릿지\npipeline/        — 시장 정보 파이프라인'; break;
        case 'clear': setHistory([]); setInput(''); return;
        case 'exit': setIsOpen(false); setInput(''); return;
        case '': break;
        default: output = `command not found: ${cmd}. Type 'help' for available commands.`;
      }

      if (cmd) setHistory(prev => [...prev, { cmd, output }]);
      setInput('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 p-4 md:p-10 flex flex-col font-mono"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="flex-1 w-full max-w-4xl mx-auto border border-bb-border bg-bb-black flex flex-col shadow-[0_0_20px_rgba(255,102,0,0.2)]">
            <div className="bg-[#222] px-2 py-1 flex items-center gap-2 border-b border-bb-border">
              <div className="w-3 h-3 bg-bb-red"></div>
              <div className="w-3 h-3 bg-bb-amber"></div>
              <div className="w-3 h-3 bg-bb-green"></div>
              <span className="text-xs text-bb-gray ml-2">luke@portfolio ~ %</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto text-sm">
              <div className="text-bb-green mb-4">
                Welcome to COSMOS OS v1.0.0<br/>
                Type &apos;help&apos; for a list of available commands.
              </div>
              {history.map((item, i) => (
                <div key={i} className="mb-2">
                  <div><span className="text-bb-green">luke@portfolio:~$</span> <span className="text-bb-white">{item.cmd}</span></div>
                  <div className="text-bb-white/70 whitespace-pre-wrap">{item.output}</div>
                </div>
              ))}
              <div className="flex items-center">
                <span className="text-bb-green mr-2">luke@portfolio:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleCommand}
                  className="bg-transparent border-none outline-none flex-1 text-bb-white"
                  autoComplete="off" spellCheck={false}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
