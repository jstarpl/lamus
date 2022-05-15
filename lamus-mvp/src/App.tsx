import React from 'react';
import logo from './logo.svg';
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

  return (
    <div className="App">
      <ReactEditorJS
        defaultValue={blocks}
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
