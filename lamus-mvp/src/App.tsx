import React from 'react';
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

function App() {
  const blocks: object[] = [];

  const editorCore = React.useRef(null)

  const handleInitialize = React.useCallback((instance: any) => {
    editorCore.current = instance
    setTimeout(() => {
      const mainEl = document.querySelector('.ce-paragraph.cdx-block') as HTMLDivElement
      if (!mainEl) console.error('Main element not found')
      mainEl.focus()
    }, 1000)
  }, [])

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
