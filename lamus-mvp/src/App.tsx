import React, { useRef, useCallback, useEffect } from 'react';
import './App.css';
import Paragraph from '@editorjs/paragraph';
import Header from '@editorjs/header';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import List from '@editorjs/list';
import Delimiter from '@editorjs/delimiter';
import Checklist from '@editorjs/checklist';
import { createReactEditorJS } from 'react-editor-js';

const ReactEditorJS = createReactEditorJS()

function focusEditor() {
  const mainEls = document.querySelectorAll('.ce-paragraph.cdx-block') as NodeListOf<HTMLDivElement>
  if (mainEls.length === 0) console.error('Block element not found')
  // select last block
  mainEls.item(mainEls.length - 1).focus()
}

function App() {
  const blocks: object[] = [];

  const editorCore = useRef(null)

  const handleInitialize = useCallback((instance: any) => {
    editorCore.current = instance
    setTimeout(() => {
      focusEditor()
    }, 1000)
  }, [])

  useEffect(() => {
    function clickHandler(e: MouseEvent) {
      const path = e.composedPath()
      let foundEditorJs = false
      for (const el of path) {
        if (el instanceof HTMLElement && el.classList.contains('codex-editor')) {
          foundEditorJs = true
          break
        }
      }

      if (foundEditorJs) return
      focusEditor()
    }

    document.addEventListener('click', clickHandler)

    return () => {
      document.removeEventListener('click', clickHandler)
    }
  })

  return (
    <div className="App">
      <ReactEditorJS
        defaultValue={blocks}
        onInitialize={handleInitialize}
        tools={{
          paragraph: Paragraph,
          header: Header,
          quote: Quote,
          marker: Marker,
          list: List,
          delimiter: Delimiter,
          checklist: Checklist,
        }} />
    </div>
  );
}

export default App;
