import { delay, htmlTextParser } from '@dvirus-js/utils';

htmlTextParser.generateStylesheet();

export const DVIRUS_JS_TOASTER_ID = 'dvirus-js-toaster';
const MESSAGE_CLASS = 'toast-message';
const MESSAGE_TEXT_CLASS = 'toast-text';
const MESSAGE_ICON_CLASS = 'toast-icon';
const MESSAGE_CLOSE_BUTTON_CLASS = 'toast-close-button';
const MESSAGE_ATTR_TYPE = 'toast-type';

const STYLE_ELEMENT_ID = 'dvirus-js-toaster-styles';

const DEFAULT_DURATION = 5_000;
const DEFAULT_WIDTH = '300px';

const ANIMATION_DURATION = 500;

let toasterContainerElement: HTMLElement | null = null;

const iconsMap: Record<string, string> = {
  info: '💬',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

export type ToasterMessageType = keyof typeof iconsMap | (string & {});

export interface ToasterOpenOptions {
  duration?: number;
  style?: Partial<CSSStyleDeclaration>;
  type?: ToasterMessageType;
  icon?: string;
}

interface _ToasterOpenOptions extends ToasterOpenOptions {
  removeMsgAbortController: AbortController;
}

export interface ToasterRef {
  close: () => void;
}

const overrideStyles = {
  message: '',
  text: '',
  icon: '',
  closeButton: '',
};

const styles = () => `
    #${DVIRUS_JS_TOASTER_ID} {
        top: 1rem;
        right: 1rem;
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        user-select: none;
        display: grid;
        justify-items: end;
    }

    #${DVIRUS_JS_TOASTER_ID} > .${MESSAGE_CLASS} {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        
        background-color: #f7f7f7;
        color: #333;
        
        width: ${DEFAULT_WIDTH};
        border-radius: 1rem;
        margin-bottom: 0.5rem;

        pointer-events: auto;
        user-select: text;
        
        transition: opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease;
        transform-origin: top center;
        
        @starting-style{    
            opacity: 0;
            transform: scale(0) translate(0, -100%);
        }

        &:hover {
            transform: scale(1.05);
            outline: 3px solid gray;
        }

        &.exiting{
            transform-origin: center center;
            opacity: 0;
            transform: scale(0.75) translate(50%, 0);
            z-index: -1;
            &:has(+ .${MESSAGE_CLASS}) {
                position: fixed;
            }
        }

        &[${MESSAGE_ATTR_TYPE}="success"] {
            background-color: #bde7c8;
            color: #0f4d1f;
        }

        &[${MESSAGE_ATTR_TYPE}="error"] {
            background-color: #f3b8bf;
            color: #611520;
        }

        &[${MESSAGE_ATTR_TYPE}="info"] {
            background-color: #b8e1ea;
            color: #0a4350;
        } 

        &[${MESSAGE_ATTR_TYPE}="warning"] {
            background-color: #fff3cd;
            color: #856404;
        }

        ${overrideStyles.message}
    }

    #${DVIRUS_JS_TOASTER_ID} > .${MESSAGE_CLASS} .${MESSAGE_ICON_CLASS}{
        &:empty{
            display: none;
        }

        ${overrideStyles.icon}
    }

    #${DVIRUS_JS_TOASTER_ID} > .${MESSAGE_CLASS} .${MESSAGE_TEXT_CLASS}{
        flex: 1;

        ${overrideStyles.text}
    }

    #${DVIRUS_JS_TOASTER_ID} > .${MESSAGE_CLASS} .${MESSAGE_CLOSE_BUTTON_CLASS}{
        --close-button-size: 1.5rem;
        line-height: var(--close-button-size);
        width: var(--close-button-size);
        height: var(--close-button-size);
        
        cursor: pointer;
        align-self: flex-start;
        border-radius: 0.5rem;
        margin: -0.5rem -1rem 0 0;
        
        transition: background-color ${ANIMATION_DURATION}ms ease, color ${ANIMATION_DURATION}ms ease;

        &:hover{
            background-color: rgba(0, 0, 0, 0.1);
        }

        ${overrideStyles.closeButton}
    }
`;

const styleElement = document.getElementById(
  STYLE_ELEMENT_ID,
) as HTMLStyleElement | null;
if (styleElement) {
  styleElement.textContent = styles();
} else {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('id', STYLE_ELEMENT_ID);
  styleElement.textContent = styles();
  document.head.appendChild(styleElement);
}

export const Toaster = {
  TOASTER_ID: DVIRUS_JS_TOASTER_ID,
  open: (message: string, options?: ToasterOpenOptions): ToasterRef => {
    initGlobalToasterContainer();

    const _options: _ToasterOpenOptions = {
      ...options,
      removeMsgAbortController: new AbortController(),
    };

    const messageElement = createMessageElement(message, _options);
    toasterContainerElement?.appendChild(messageElement);
    return {
      close: () => {
        removeMessageElement(messageElement, _options);
      },
    };
  },
  success: (message: string, options?: Omit<ToasterOpenOptions, 'type'>) =>
    Toaster.open(message, { ...options, type: 'success' }),
  error: (message: string, options?: Omit<ToasterOpenOptions, 'type'>) =>
    Toaster.open(message, { ...options, type: 'error' }),
  info: (message: string, options?: Omit<ToasterOpenOptions, 'type'>) =>
    Toaster.open(message, { ...options, type: 'info' }),
  warning: (message: string, options?: Omit<ToasterOpenOptions, 'type'>) =>
    Toaster.open(message, { ...options, type: 'warning' }),

  /**
   * Override default styles. Styles should be provided in CSS format, e.g. "color: red; font-size: 20px;"
   *
   * also pseudo selectors are supported:
   *```ts
   * overrideStyles({
   *   message: `
   *          background-color: white;
   *          color: green;
   *          font-size: 1.2rem;
   *          &[toast-type='error'] {
   *              background-color: black;
   *              color: red;
   *           }`,
   *   icon: "&:empty { display: none; }",
   *   closeButton: "&:hover { background-color: rgba(0, 0, 0, 0.1); }"
   * })
   * ```
   * @param newStyles
   */
  overrideStyles: (newStyles: Partial<typeof overrideStyles>) => {
    newStyles = Object.fromEntries(
      Object.entries(newStyles).map(([key, value]) => [
        key,
        value.replace(/;/g, ' !important;'),
      ]),
    );
    Object.assign(overrideStyles, newStyles);
    const styleElement = document.getElementById(STYLE_ELEMENT_ID);
    if (styleElement) {
      styleElement.textContent = styles();
    }
  },
};

function startRemoveMessageTimer(
  element: HTMLElement,
  options: _ToasterOpenOptions | undefined,
): ReturnType<typeof setTimeout> {
  return setTimeout(
    () => removeMessageElement(element, options),
    options?.duration ?? DEFAULT_DURATION,
  );
}

function removeMessageElement(
  element: HTMLElement,
  options: _ToasterOpenOptions | undefined,
): void {
  element.classList.add('exiting');
  delay(ANIMATION_DURATION).then(() => {
    element.remove();
    options?.removeMsgAbortController.abort();
  });
}

function createIcon(type: ToasterMessageType): HTMLElement {
  const iconElement = document.createElement('span');
  iconElement.className = MESSAGE_ICON_CLASS;

  const icon = iconsMap[type] || type;
  if (icon) {
    iconElement.textContent = icon;
  }

  return iconElement;
}

function createMessageElement(
  message: string,
  options: _ToasterOpenOptions | undefined,
): HTMLElement {
  const messageElement = document.createElement('div');
  messageElement.className = MESSAGE_CLASS;
  messageElementHover(messageElement, options);

  const closeButton = createCloseButton();
  closeButton.addEventListener(
    'click',
    () => (
      removeMessageElement(messageElement, options),
      options?.removeMsgAbortController.abort()
    ),
    {
      signal: options?.removeMsgAbortController.signal,
    },
  );

  if (options?.type) {
    messageElement.setAttribute(MESSAGE_ATTR_TYPE, options.type);
    messageElement.prepend(createIcon(options.icon ?? options.type));
  } else if (options?.icon) {
    messageElement.prepend(createIcon(options.icon));
  }
  Object.assign(messageElement.style, options?.style);

  messageElement.appendChild(createTextElement(message)); // 1: first  - text
  messageElement.appendChild(closeButton); //                2: second - close button
  return messageElement;
}

function createTextElement(message: string): HTMLElement {
  const textElement = document.createElement('span');
  textElement.className = MESSAGE_TEXT_CLASS;
  htmlTextParser.appendToDom(textElement, message);
  // textElement.textContent = message;
  return textElement;
}

function createCloseButton(): HTMLElement {
  const closeButton = document.createElement('button');
  closeButton.textContent = '\u00d7';
  closeButton.classList.add(MESSAGE_CLOSE_BUTTON_CLASS);
  return closeButton;
}

function messageElementHover(
  element: HTMLElement,
  options: _ToasterOpenOptions | undefined,
): void {
  let timer: ReturnType<typeof setTimeout> | undefined =
    startRemoveMessageTimer(element, options);
  element.addEventListener(
    'mouseenter',
    () => {
      clearTimeout(timer);
      timer = undefined;
    },
    { signal: options?.removeMsgAbortController.signal },
  );
  element.addEventListener(
    'mouseleave',
    () => {
      timer = startRemoveMessageTimer(element, options);
    },
    { signal: options?.removeMsgAbortController.signal },
  );
}

function initGlobalToasterContainer(): void {
  if (toasterContainerElement) return;

  const toaster = document.getElementById(DVIRUS_JS_TOASTER_ID);
  if (!toaster) {
    console.error(noContainerError);
    return;
  }

  toasterContainerElement = toaster;
}

const noContainerError = `
${DVIRUS_JS_TOASTER_ID} Id not found. Please ensure there is an element with this id in the DOM.
                
<div id="${DVIRUS_JS_TOASTER_ID}"></div>

you can add styles as well:
<div id="${DVIRUS_JS_TOASTER_ID}" style="right: auto; left: 1rem"></div>

bind the constant DVIRUS_JS_TOASTER_ID:
// vanilla 
const div = document.createElement("div");
div.id = DVIRUS_JS_TOASTER_ID;
document.body.appendChild(div);

// react
<div id={DVIRUS_JS_TOASTER_ID}></div>

// angular
<div [id]="DVIRUS_JS_TOASTER_ID"></div>
`;
