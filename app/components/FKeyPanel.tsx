"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FKeyData {
  key: string;
  label: string;
  title: string;
  rows: { field: string; value: string }[];
  note?: string;
}

const FKEY_DATA: FKeyData[] = [
  {
    key: 'F1', label: 'Python', title: 'PYTHON RUNTIME ANALYSIS',
    rows: [
      { field: 'Version', value: '3.12+' },
      { field: 'Experience', value: '2026.01 ~' },
      { field: 'Primary Use', value: 'RAG Pipelines, Data Engineering' },
      { field: 'Key Libraries', value: 'FastAPI, Pydantic, LangChain' },
      { field: 'Framework', value: 'Claude Code + Python scripting' },
      { field: 'LOC Written', value: '10,000+ (estimated)' },
    ],
    note: '모든 AI 시스템의 기반 언어. 빠른 프로토타이핑과 프로덕션 파이프라인 모두에 사용.',
  },
  {
    key: 'F2', label: 'Claude Code', title: 'CLAUDE CODE TERMINAL STATUS',
    rows: [
      { field: 'Usage', value: 'DAILY — Primary Tool' },
      { field: 'Model', value: 'Claude Opus 4.6 (1M context)' },
      { field: 'Plugins', value: 'GSD, Swarm, Codex Bridge' },
      { field: 'Skills Installed', value: '48+' },
      { field: 'MCP Servers', value: 'Context7, Codex, Telegram' },
      { field: 'Goal', value: '성능 최적화 기여 & 워크플로우 개선' },
    ],
    note: '2026년 1월 첫 만남 이후, 매일 사용하는 핵심 AI 코딩 파트너. Harness engineering과 agent orchestration을 이 도구로 학습 중.',
  },
  {
    key: 'F3', label: 'FX/Credit', title: 'FX & CREDIT MARKET COVERAGE',
    rows: [
      { field: 'Experience', value: '10+ years' },
      { field: 'Products', value: 'FX Spot/Forward/Options, Credit, DCM' },
      { field: 'Coverage', value: 'Institutional Investors, BBD' },
      { field: 'Speciality', value: 'Cross-border Flows, Structuring' },
      { field: 'Markets', value: 'KRW, USD, EUR, CNH' },
      { field: 'Role', value: 'Deal Architecture & Narrative Building' },
    ],
    note: '단순한 세일즈가 아닌, 딜의 구조를 설계하고 스토리를 만드는 Deal Architect.',
  },
  {
    key: 'F4', label: 'RAG Systems', title: 'RAG PIPELINE ARCHITECTURE',
    rows: [
      { field: 'Vector DB', value: 'ChromaDB / FAISS' },
      { field: 'Embeddings', value: 'OpenAI / Local (MLX)' },
      { field: 'Chunking', value: 'Semantic + Fixed-size hybrid' },
      { field: 'Sources', value: 'RSS, News, Research, PDF' },
      { field: 'Retrieval', value: 'Multi-query + Reranking' },
      { field: 'Output', value: 'Investment Memos, Briefs' },
    ],
    note: 'COSMOS의 핵심 엔진. 수백 개 소스에서 관련 정보를 검색하고 투자 인사이트로 압축.',
  },
  {
    key: 'F5', label: 'Macro', title: 'MACRO ENVIRONMENT SCANNER',
    rows: [
      { field: 'Scope', value: 'Global / KR / US / CN' },
      { field: 'Data Sources', value: 'Bloomberg, Reuters, RSS' },
      { field: 'Themes', value: 'Rates, FX, Credit Spreads' },
      { field: 'Framework', value: 'Theme-driven + Structural' },
      { field: 'Horizon', value: '3-12 months (medium-term)' },
      { field: 'Output', value: 'Daily Brief, Weekly Outlook' },
    ],
    note: '거시 환경을 체계적으로 스캔하고, 테마 기반 투자 전략으로 연결.',
  },
];

export default function FKeyPanel() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const activeData = FKEY_DATA.find(f => f.key === openKey);

  return (
    <>
      {/* F-Key Buttons */}
      <div className="flex flex-wrap">
        {FKEY_DATA.map((fk) => (
          <div
            key={fk.key}
            onClick={() => setOpenKey(openKey === fk.key ? null : fk.key)}
            className={`border px-2 py-1 text-xs cursor-pointer inline-flex mr-1 mb-1 transition-all ${
              openKey === fk.key
                ? 'border-bb-orange bg-bb-orange text-bb-black font-bold shadow-[0_0_8px_#FF6600]'
                : 'border-bb-border bg-bb-black hover:border-bb-orange hover:shadow-[0_0_5px_#FF6600]'
            }`}
          >
            <span className={`mr-1 font-bold ${openKey === fk.key ? 'text-bb-black' : 'text-bb-orange'}`}>&lt;{fk.key}&gt;</span>
            <span className={openKey === fk.key ? 'text-bb-black' : 'text-bb-white'}>{fk.label}</span>
          </div>
        ))}
        <div className="text-bb-gray text-[10px] self-center ml-2">← CLICK TO EXPAND</div>
      </div>

      {/* Popup Panel */}
      <AnimatePresence>
        {activeData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 border border-bb-orange bg-bb-black overflow-hidden"
          >
            <div className="flex justify-between items-center px-3 py-1 bg-[#1a0f00] border-b border-bb-orange">
              <span className="text-bb-orange font-bold text-xs">{'>>'} {activeData.title}</span>
              <button onClick={() => setOpenKey(null)} className="text-bb-gray hover:text-bb-orange text-xs">✕ CLOSE</button>
            </div>
            <div className="p-3 text-xs font-mono">
              <table className="w-full">
                <tbody>
                  {activeData.rows.map((row, i) => (
                    <tr key={i} className="border-b border-bb-border">
                      <td className="py-1 text-bb-gray w-1/3">{row.field}</td>
                      <td className="py-1 text-bb-white text-right">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeData.note && (
                <div className="mt-3 border-t border-bb-border pt-2 text-bb-gray leading-relaxed">
                  <span className="text-bb-amber">NOTE:</span> {activeData.note}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
