"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

type AiResult = {
  corrected: string;
  explanation: string;
};

export default function EnglishLearningEditor() {
  const [text, setText] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [replace, setReplace] = useState<string>('');
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decorationIdsRef = useRef<string[]>([]);

  // エディタのマウント時の処理
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // 必須機能：New（クリア）
  const handleNew = () => {
    setText('');
    setAiResult(null);
    setError(null);
  };

  // 必須機能：Save（.txtダウンロード）
  const handleSave = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 必須機能：Load（ファイル読み込み）
  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 必須機能：Undo / Redo（Monaco標準の履歴機能を利用・最大50回以上対応可能）
  const handleUndo = () => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  };

  // 必須機能：Search（全一致ハイライト）
  const handleSearch = () => {
    const editor = editorRef.current;
    if (!editor || !search) return;
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(search, false, false, false, null, true);
    const newDecorations = matches.map((match) => ({
      range: match.range,
      options: { inlineClassName: 'search-highlight' },
    }));

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      newDecorations
    );
  };

  // 必須機能：Replace（全置換）
  const handleReplace = () => {
    const editor = editorRef.current;
    if (!editor || !search) return;
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(search, false, false, false, null, true);
    const edits = matches.map((match) => ({
      range: match.range,
      text: replace,
    }));

    editor.executeEdits('replace', edits);
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
  };

  // AI機能：Check English
  const handleCheckEnglish = async () => {
    if (!text.trim()) {
      setError('テキストが入力されていません');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_NVIDIA_API_KEY;
    if (!apiKey) {
      setError('環境変数にAPIキーが設定されていません');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAiResult(null);

    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional English teacher.\n\nTasks:\n1. Correct the sentence\n2. Explain mistakes simply\n\nFormat:\nCorrected:\nExplanation:',
            },
            {
              role: 'user',
              content: text,
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error('API通信に失敗しました');
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';

      // AI出力形式の抽出（正規表現）
      const match = content.match(/Corrected:\s*([\s\S]*?)\s*Explanation:\s*([\s\S]*)/i);

      if (match) {
        setAiResult({
          corrected: match[1].trim(),
          explanation: match[2].trim(),
        });
      } else {
        setError('レスポンスのフォーマットが不正です');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <style>{`
        .search-highlight {
          background-color: yellow;
        }
      `}</style>

      {/* ファイル読み込み用非表示インプット */}
      <input
        type="file"
        accept=".txt"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleNew}>New</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleLoadClick}>Load</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleRedo}>Redo</button>
        
        <div style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
          <input
            type="text"
            placeholder="検索文字列"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            placeholder="置換文字列"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
          />
          <button onClick={handleReplace}>Replace</button>
        </div>

        <button 
          onClick={handleCheckEnglish} 
          disabled={isLoading}
          style={{ marginLeft: '20px', fontWeight: 'bold' }}
        >
          Check English
        </button>
      </div>

      {isLoading && <div style={{ marginBottom: '10px' }}>通信中...</div>}
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, height: '600px', border: '1px solid #ccc' }}>
          <Editor
            height="100%"
            defaultLanguage="plaintext"
            value={text}
            onChange={(val) => setText(val || '')}
            onMount={handleEditorDidMount}
            options={{
              lineNumbers: 'on',
              minimap: { enabled: false },
              wordWrap: 'on',
            }}
          />
        </div>

        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9', overflowY: 'auto', height: '600px' }}>
          <h2 style={{ fontSize: '18px', marginTop: 0 }}>添削結果領域</h2>
          {aiResult ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#333' }}>修正文</h3>
                <div style={{ padding: '10px', backgroundColor: '#fff', border: '1px solid #eee' }}>
                  {aiResult.corrected}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#333' }}>説明</h3>
                <div style={{ padding: '10px', backgroundColor: '#fff', border: '1px solid #eee', whiteSpace: 'pre-wrap' }}>
                  {aiResult.explanation}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#666' }}>添削結果がここに表示されます</div>
          )}
        </div>
      </div>
    </div>
  );
}
