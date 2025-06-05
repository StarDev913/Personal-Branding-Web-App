import { DataSourceManager } from '../src';
import CanvasEvents from '../src/canvas/types';
import { ObjectAny } from '../src/common';
import {
  DataConditionIfFalseType,
  DataConditionIfTrueType,
} from '../src/data_sources/model/conditional_variables/constants';
import { NumberOperation } from '../src/data_sources/model/conditional_variables/operators/NumberOperator';
import Editor from '../src/editor';
import { EditorConfig } from '../src/editor/config/config';
import EditorModel from '../src/editor/model/Editor';

// DocEl + Head + Wrapper
export const DEFAULT_CMPS = 3;

export function setupTestEditor(opts?: { withCanvas?: boolean; config?: Partial<EditorConfig> }) {
  document.body.innerHTML = '<div id="fixtures"></div> <div id="canvas-wrp"></div> <div id="editor"></div>';
  const editor = new Editor({
    mediaCondition: 'max-width',
    el: document.body.querySelector('#editor') as HTMLElement,
    avoidInlineStyle: true,
    ...opts?.config,
  });
  const em = editor.getModel();
  const dsm = em.DataSources;
  const { Pages, Components, Canvas } = em;
  Pages.onLoad();
  const cmpRoot = Components.getWrapper()!;
  const View = Components.getType('wrapper')!.view;
  const wrapperEl = new View({
    model: cmpRoot,
    config: { ...cmpRoot.config, em },
  });
  wrapperEl.render();
  const fixtures = document.body.querySelector('#fixtures')!;
  fixtures.appendChild(wrapperEl.el);
  const canvasWrapEl = document.body.querySelector('#canvas-wrp')!;

  /**
   * When trying to render the canvas, seems like jest gets stuck in a loop of iframe.onload (FrameView.ts)
   * and all subsequent tests containing setTimeout are not executed.
   */
  if (opts?.withCanvas) {
    Canvas.postLoad();
    canvasWrapEl.appendChild(Canvas.render());
    editor.on(CanvasEvents.frameLoad, ({ el }) => {
      // this seems to fix the issue of the loop
      el.onload = null;
    });
    // Enable undo manager
    editor.Pages.postLoad();
  }

  return { editor, em, dsm, cmpRoot, fixtures: fixtures as HTMLElement };
}

export function fixJsDom(editor: Editor) {
  fixJsDomIframe(editor);
}

export const fixJsDomIframe = (em: EditorModel | Editor) => {
  em.on(CanvasEvents.frameLoad, ({ el, view }) => {
    // this seems to fix the issue of the loop
    el.onload = null;
  });
};

export function waitEditorEvent(em: Editor | EditorModel, event: string) {
  return new Promise((resolve) => em.once(event, resolve));
}

export function flattenHTML(html: string) {
  return html.replace(/>\s+|\s+</g, (m) => m.trim());
}

// Filter out the unique ids and selectors replaced with 'data-variable-id'
// Makes the snapshot more stable
export function filterObjectForSnapshot(obj: any, parentKey: string = ''): any {
  const result: any = {};

  for (const key in obj) {
    if (key === 'id') {
      result[key] = 'data-variable-id';
      continue;
    }

    if (key === 'selectors') {
      result[key] = obj[key].map(() => 'data-variable-id');
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (Array.isArray(obj[key])) {
        result[key] = obj[key].map((item: any) =>
          typeof item === 'object' ? filterObjectForSnapshot(item, key) : item,
        );
      } else {
        result[key] = filterObjectForSnapshot(obj[key], key);
      }
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}

const baseComponent = {
  type: 'text',
  tagName: 'h1',
};

const createContent = (content: string) => ({
  ...baseComponent,
  content,
});

/**
 * Creates a component definition for a conditional component (ifTrue or ifFalse).
 * @param type - The component type (e.g., DataConditionIfTrueType).
 * @param content - The text content.
 * @returns The component definition.
 */
const createConditionalComponentDef = (type: string, content: string) => ({
  type,
  components: [createContent(content)],
});

export const ifTrueText = 'true text';
export const newIfTrueText = 'new true text';
export const ifFalseText = 'false text';
export const newIfFalseText = 'new false text';

export const ifTrueComponentDef = createConditionalComponentDef(DataConditionIfTrueType, ifTrueText);
export const newIfTrueComponentDef = createConditionalComponentDef(DataConditionIfTrueType, newIfTrueText);
export const ifFalseComponentDef = createConditionalComponentDef(DataConditionIfFalseType, ifFalseText);
export const newIfFalseComponentDef = createConditionalComponentDef(DataConditionIfFalseType, newIfFalseText);

export function isObjectContained(received: ObjectAny, expected: ObjectAny): boolean {
  return Object.keys(expected).every((key) => {
    if (typeof expected[key] === 'object' && expected[key] !== null) {
      return isObjectContained(received[key], expected[key]);
    }

    return received?.[key] === expected?.[key];
  });
}

export const TRUE_CONDITION = {
  left: 1,
  operator: NumberOperation.greaterThan,
  right: 0,
};

export const FALSE_CONDITION = {
  left: 0,
  operator: NumberOperation.lessThan,
  right: -1,
};
