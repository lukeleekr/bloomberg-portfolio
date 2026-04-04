"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tool {
  fkey: string;
  name: string;
  usage: string;
  desc: string;
  highlight: boolean;
  details: { field: string; value: string }[];
  note: string;
}

const tools: Tool[] = [
  {
    fkey: "F1", name: "Claude Code", usage: "DAILY USE", highlight: true,
    desc: "매일 사용하는 핵심 AI 파트너. 워크플로우 전반의 코드 작성 담당",
    details: [
      { field: "Model", value: "Claude Opus 4.6 (1M context)" },
      { field: "Plugins", value: "GSD, Swarm, Codex Bridge" },
      { field: "Skills", value: "48+ installed" },
      { field: "MCP Servers", value: "Context7, Codex, Telegram" },
      { field: "Session Style", value: "CMUX multi-pane terminal" },
    ],
    note: "성능 최적화와 harness engineering에 기여하고 싶은 도구. 매일 8시간+ 사용.",
  },
  {
    fkey: "F2", name: "Codex CLI", usage: "WEEKLY", highlight: false,
    desc: "GPT 기반 코드 리뷰어 및 디베이트 파트너",
    details: [
      { field: "Model", value: "GPT-5.4" },
      { field: "Role", value: "Code reviewer, Debate partner" },
      { field: "Integration", value: "Claude Code MCP bridge" },
      { field: "Cost", value: "Zero (ChatGPT subscription)" },
    ],
    note: "Claude Code와 연동하여 멀티 모델 코드 리뷰 및 디베이트 자동화.",
  },
  {
    fkey: "F3", name: "Python", usage: "DAILY USE", highlight: false,
    desc: "모든 아키텍처의 접착제 (RAG, Pipeline)",
    details: [
      { field: "Version", value: "3.12+" },
      { field: "Key Libs", value: "FastAPI, Pydantic, LangChain" },
      { field: "Use Cases", value: "RAG, Data Pipeline, Automation" },
      { field: "Style", value: "PEP 8, Type hints, TDD" },
    ],
    note: "AI 시스템의 모든 컴포넌트를 연결하는 핵심 언어.",
  },
  {
    fkey: "F4", name: "MCP Protocol", usage: "EXPERIMENTAL", highlight: false,
    desc: "멀티 에이전트 브릿징 및 상태 관리",
    details: [
      { field: "Status", value: "Learning & Experimenting" },
      { field: "Use Case", value: "Agent-to-agent communication" },
      { field: "Servers", value: "Context7, Codex, Custom" },
      { field: "Goal", value: "Custom MCP server 개발" },
    ],
    note: "에이전트 간 통신의 미래. 직접 MCP 서버를 만들어보는 것이 다음 목표.",
  },
  {
    fkey: "F5", name: "Telegram Bot", usage: "DAILY USE", highlight: false,
    desc: "원격 AI 인터페이스 & 알림 채널",
    details: [
      { field: "Purpose", value: "Remote Claude Code interface" },
      { field: "Features", value: "Commands, Alerts, File sharing" },
      { field: "Integration", value: "Claude Code MCP plugin" },
    ],
    note: "모바일에서 Claude Code 세션을 원격으로 제어하는 인터페이스.",
  },
  {
    fkey: "F6", name: "MLX / Ollama", usage: "EXPERIMENTAL", highlight: false,
    desc: "M3 Ultra에서 로컬 LLM 실험",
    details: [
      { field: "Hardware", value: "M3 Ultra 96GB" },
      { field: "Models", value: "Llama, Mistral, Phi" },
      { field: "Framework", value: "MLX (Apple), Ollama" },
    ],
    note: "로컬 환경에서 소형 LLM 실험. 프라이버시가 중요한 금융 데이터 처리 탐구.",
  },
];

export default function ToolboxPanel() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="p-2 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {tools.map((tool) => (
          <div key={tool.fkey}>
            <div
              onClick={() => setOpenKey(openKey === tool.fkey ? null : tool.fkey)}
              className={`border p-2 cursor-pointer transition-all ${
                openKey === tool.fkey ? 'border-bb-orange bg-[#1a0f00] shadow-[0_0_8px_#FF6600]' : 'border-bb-border bg-bb-black hover:border-bb-orange'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <span className={`px-1 mr-2 font-bold ${
                    openKey === tool.fkey ? 'text-bb-black bg-bb-orange' :
                    'text-bb-orange border border-bb-border'
                  }`}>
                    &lt;{tool.fkey}&gt;
                  </span>
                  <span className="text-bb-white font-bold">{tool.name}</span>
                </div>
                <span className={`text-[10px] ${openKey === tool.fkey ? 'text-bb-orange' : 'text-bb-gray'}`}>[{tool.usage}]</span>
              </div>
              <div className="text-bb-gray leading-tight">{tool.desc}</div>
              <div className="text-bb-gray text-[10px] mt-1">CLICK TO {openKey === tool.fkey ? 'CLOSE' : 'EXPAND'} ▾</div>
            </div>

            <AnimatePresence>
              {openKey === tool.fkey && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-t-0 border-bb-orange bg-[#0a0700] overflow-hidden"
                >
                  <div className="p-2 font-mono">
                    <table className="w-full">
                      <tbody>
                        {tool.details.map((d, i) => (
                          <tr key={i} className="border-b border-bb-border">
                            <td className="py-1 text-bb-gray">{d.field}</td>
                            <td className="py-1 text-bb-white text-right">{d.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 text-bb-gray border-t border-bb-border pt-1">
                      <span className="text-bb-amber">NOTE:</span> {tool.note}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
