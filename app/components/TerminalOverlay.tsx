"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BANNER = `>> COSMOS OS v2.1 — Personal AI Terminal
>> Powered by Claude Code v2.1.92 | M3 Ultra (96GB)
>> ================================================`;

const COMMANDS: Record<string, string> = {
  help: `Available commands:
  whoami      — Who is Luke Lee?
  neofetch    — System info (Bloomberg style)
  cat about   — About me
  ls skills   — Skill tree
  ls projects — Project directory
  cosmos      — COSMOS system status
  stack       — Tech stack
  contact     — Contact info
  date        — Current time (KST)
  fortune     — Random quote
  matrix      — ██████████
  clear       — Clear terminal
  exit        — Close terminal`,

  whoami: `이용훈 / Luke Lee
------------------------------------
Title:    Executive Director
Domain:   Financial Markets (FX / Rates / Credit)
Location: Seoul, Korea
AI Since: 2026.01
Focus:    Agent Orchestration & Harness Engineering
Mission:  Claude Code 성능 최적화 기여`,

  neofetch: `  .---.                     luke@cosmos-os
 /     \\                    -----------------
|  C O S |                   OS:     COSMOS OS v2.1
|  M O S |                   Host:   M3 Ultra (96GB)
 \\     /                    Shell:  zsh + CMUX
  '---'                     AI:     Claude Code v2.1.92
    |                       Model:  Claude Opus 4.6 (1M)
   / \\                      Skills: 48+ installed
  /   \\                     MCP:    3 servers active
 /_____\\                    Uptime: Since 2026.01`,

  'cat about': `14살에 호주 Perth로 이주. 고등학교를 마치고
Melbourne으로 이동, University of Melbourne에서
회계/금융을 전공. UPenn MCIT 컴퓨터공학 석사.

첫 직장에서 10년간 한 번도 이직하지 않고
FX, Rates, Credit 영역의 Deal Architect로 성장.

2026년 1월 Claude Code를 만난 후
AI 코딩과 에이전트 프로그래밍에 깊이 빠져들었고,
지금은 Harness Engineering과 Agent Orchestration
에 집중하며 Claude Code 최적화에 기여하고 싶다.

기타와 노래를 좋아하는 평범한 사람.`,

  'ls skills': `drwxr-xr-x  finance/         [10+ years]
  ├── fx-derivatives       ████████████████████ 95%
  ├── rates-structuring    ██████████████████   90%
  ├── credit               ██████████████████   90%
  ├── macro-analysis       █████████████████    85%
  └── deal-architecture    ██████████████████   90%

drwxr-xr-x  tech/            [2026.01~]
  ├── claude-code          ████████████████████ 95%
  ├── llm-orchestration    ██████████████████   90%
  ├── rag-systems          ██████████████████   90%
  ├── python               █████████████████    85%
  └── agent-programming    ████████████████     80%`,

  'ls projects': `total 8
drwxr-xr-x COSMOS/             AI 투자 인텔리전스 플랫폼         LIVE
drwxr-xr-x Swarm/              멀티 에이전트 오케스트레이션       LIVE
drwxr-xr-x Multi-Model-Bridge/ Claude + GPT MCP 브릿지           LIVE
drwxr-xr-x Intel-Pipeline/     시장 시그널 추출 파이프라인       LIVE
drwxr-xr-x AlphaWeaver/        ML 기반 퀀트 트레이딩 알고리즘    DEV
drwxr-xr-x Pulse/              무료 멀티소스 리서치 수집기       LIVE
drwxr-xr-x KakaoTalk-Summary/  채팅 → HTML 다이제스트 생성기     LIVE
drwxr-xr-x Bloomberg-Portfolio/ 이 사이트 — 터미널 클론           LIVE`,

  cosmos: `+----------------------------------------------+
|           COSMOS SYSTEM STATUS               |
+----------------------------------------------+
| Athena (Intelligence)    * ONLINE            |
| Noah (RAG Layer)         * ONLINE            |
| Agora (Debate Engine)    * STANDBY           |
| Portfolio Manager        o IN DEVELOPMENT    |
| Goichi (Tech Analysis)   o IN DEVELOPMENT    |
+----------------------------------------------+
| Articles/Day:  100,000+                      |
| Knowledge Graph: Obsidian (4-node arch)      |
| Vector DB:     ChromaDB + nomic-embed        |
| Debate Model:  Adversarial (Red vs Blue)     |
+----------------------------------------------+`,

  stack: `RUNTIME        VERSION     STATUS
---------------------------------
Claude Code    v2.1.92     * active
Python         3.12+       * active
Node.js        v25         * active
Codex CLI      GPT-5.4     * active
MLX / Ollama   local       o standby
---------------------------------
MCP SERVERS    3 active
SKILLS         48+ installed
GIT COMMITS    500+`,

  contact: `  GitHub:    github.com/lukeleekr
  LinkedIn:  linkedin.com/in/lukeleekr
  Email:     lukeleekr@gmail.com`,
};

const FORTUNES = [
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"잠들지 않는 애널리스트. 최종 결정은 항상 내가 한다." — COSMOS 철학',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"AI가 세상을 바꾸는 게 아니라, AI를 쓰는 사람이 바꾼다."',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"금융은 세상의 심장. AI는 새로운 심장 박동." — Luke Lee',
];

export default function TerminalOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{cmd: string, output: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === '`') && !isOpen) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setHistory([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const runCommand = (cmd: string): string => {
    if (cmd === 'date') return new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    if (cmd === 'fortune') return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    if (cmd === 'matrix') return Array.from({ length: 6 }, () => Array.from({ length: 50 }, () => Math.random() > 0.5 ? '#' : '.').join('')).join('\n');
    return COMMANDS[cmd] || `zsh: command not found: ${cmd}\nType 'help' for available commands.`;
  };

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const cmd = input.trim().toLowerCase();
    setInput('');
    if (!cmd) return;

    if (cmd === 'clear') { setHistory([]); return; }
    if (cmd === 'exit') { setIsOpen(false); setHistory([]); return; }

    setHistory(prev => [...prev, { cmd, output: runCommand(cmd) }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/95 p-2 md:p-8 flex flex-col font-mono"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsOpen(false); setHistory([]); } }}
        >
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1 w-full max-w-4xl mx-auto border border-bb-orange bg-bb-black flex flex-col shadow-[0_0_30px_rgba(255,102,0,0.3)]"
          >
            {/* Title bar */}
            <div className="bg-[#1a0f00] px-3 py-1.5 flex items-center justify-between border-b border-bb-orange">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-bb-red cursor-pointer" onClick={() => { setIsOpen(false); setHistory([]); }} />
                <div className="w-2.5 h-2.5 bg-bb-amber" />
                <div className="w-2.5 h-2.5 bg-bb-green" />
                <span className="text-[10px] text-bb-gray ml-3">COSMOS Terminal — luke@portfolio</span>
              </div>
              <span className="text-[10px] text-bb-orange">Press ESC to close</span>
            </div>

            {/* Terminal body */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto text-xs md:text-sm scrollbar-hide">
              {/* Boot sequence */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-bb-orange whitespace-pre">{BANNER}</div>
                <div className="text-bb-green mt-2">
                  Type &apos;help&apos; for available commands. Press ESC or type &apos;exit&apos; to close.
                </div>
                <div className="text-bb-gray text-[10px] mt-1 mb-4">
                  Last login: {new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })} on ttys000
                </div>
              </motion.div>

              {/* History */}
              {history.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-3"
                >
                  <div>
                    <span className="text-bb-green">luke@cosmos</span>
                    <span className="text-bb-white">:</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-bb-white">$ </span>
                    <span className="text-bb-white">{item.cmd}</span>
                  </div>
                  <div className="text-bb-white/80 whitespace-pre-wrap mt-0.5 leading-relaxed">{item.output}</div>
                </motion.div>
              ))}

              {/* Input line */}
              <div className="flex items-center">
                <span className="text-bb-green whitespace-nowrap">luke@cosmos:~$ </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleCommand}
                  className="bg-transparent border-none outline-none flex-1 text-bb-white"
                  style={{ caretColor: '#FF6600' }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
