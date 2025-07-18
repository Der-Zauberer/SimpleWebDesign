class Swd {

    static #instance;

    #loaded = false;
    #afterRenderedActions = [];

    #fallbackLanguage;
    #languages = new Map();
    #translation = new Map();
    #currentLocale;

    constructor() {
        if (Swd.#instance) throw new Error('Swd is already instantiated!');
        Swd.#instance = this;
        document.addEventListener('readystatechange', event => {
            if (event.target.readyState === 'interactive') {
                this.#loaded = true;
                this.#afterRenderedActions.forEach(action => action());
                new MutationObserver((mutations, observer) => {
                    for (const mutation of mutations) {
                        const elements = Array.from(mutation.target.querySelectorAll('*'))
                        .filter(element => this.#preFilterElementsByAttributeName(element, 'i18n'))
                        .filter(target => {
                            if (target.swdIgnoreNextI18nUpdate) {
                                target.swdIgnoreNextI18nUpdate = false;
                                return false;
                            }
                            return true;
                        });
                        if (elements.length !== 0) this.#translate(elements);
                    }
                }).observe(document, { attributes: true, childList: true, subtree: true });
            }
        })
    }

    from(element) {
        if (!element) throw new ReferenceError(`element is undefined`)
        for (const [key, value] of Object.entries(new SwdElementRef(element))) {
            if (!element[key]) {
                element[key] = value;
            }
        }
        element.swdElementRef = element;
        return element;
    }

    query(query) {
        const element = document.querySelector(query)
        if (!element) throw new ReferenceError(`query result is undefined`)
        return this.from(element);
    }

    doAfterRendered(action) {
        if (this.#loaded) action();
        else this.#afterRenderedActions.push(action);
    }

    configureLanguages(languages) {
        for (const language of languages.languages) {
            this.#languages.set(language.locale, language.src);
        }
        this.#fallbackLanguage = languages.fallback;
    }

    async setLanguage(locale) {
        const src = this.#languages.get(locale) || this.#languages.get(this.#fallbackLanguage);
        if (src == undefined) return;
        const content = await fetch(src).then(response => response.text());
        this.#translation.clear();
        for (const line of content.split(/\r?\n/gm)) {
            const [key, value] = line.split('=').map(value => value.trim());
            if (key && value) this.#translation.set(key, value);
        }
        this.#currentLocale = locale;
        this.doAfterRendered(() => this.#translate(Array.from(document.querySelectorAll('*')).filter(element => this.#preFilterElementsByAttributeName(element, 'i18n'))));
    }

    i18n(key) {
        const value = this.#translation.get(key);
        if (!value) console.warn(`I18n key "${key}" does not exist in language "${this.#currentLocale}"`);
        return value || `${key}[${this.#currentLocale}]`;
    }

    #translate(elements) {
        for (const element of this.filterElementsByAttributeName('i18n', elements)) {
            element.value = this.i18n(element.key);
            element.element.swdIgnoreNextI18nUpdate = true;
        }
    }

    #preFilterElementsByAttributeName(element, name) {
        return Array.from(element.attributes).filter(attribute => attribute.name === name || attribute.name.startsWith(`${name}-`)).length !== 0;
    }

    filterElementsByAttributeName(name, elements) {
        const filteredElements = []
        for (const element of elements) {
            for (const attribute of element.attributes) {
                if (attribute.name === name && element.tagName === 'INPUT') {
                    filteredElements.push({ 
                        key: attribute.value,
                        element,
                        get value() { return element.value }, 
                        set value(value) { element.value = value } 
                    });
                } else if (attribute.name === name) {
                    filteredElements.push({ 
                        key: attribute.value,
                        element,
                        get value() { return element.innerText }, 
                        set value(value) { element.innerText = value } 
                    });
                } else if (attribute.name === `${name}-innerhtml`) {
                    filteredElements.push({ 
                        key: attribute.value,
                        element,
                        get value() { return element.innerHTML }, 
                        set value(value) { element.innerHTML = value } 
                    });
                } else if (attribute.name.startsWith(`${name}-`)) {
                    const attributeName = attribute.name.substring(name.length + 1);
                    filteredElements.push({ 
                        key: attribute.value,
                        element,
                        get value() { return element.getAttribute(attributeName) }, 
                        set value(value) { element.setAttribute(attributeName, value) } 
                    });
                }
            }
        }
        return filteredElements;
    }

}

window.swd = new Swd();

document.addEventListener('click', event => { SwdNavigation.autoHide(event); SwdDropdown.autoHide(event); });
document.addEventListener('input', event => event.target.setAttribute('dirty', 'true'));

document.addEventListener('scroll', () => requestAnimationFrame(SwdDropdown.resizeAllDropdowns), { passive: true });
window.addEventListener('resize', () => requestAnimationFrame(SwdDropdown.resizeAllDropdowns));

window.addEventListener('wheel', event => SwdNavigation.wheel(event), { passive: false });
window.addEventListener('touchstart', event => SwdNavigation.touchStart(event));
window.addEventListener('touchmove', event => SwdNavigation.touchMove(event), { passive: false });

class SwdElementRef {

    #swdElementRef

    constructor(element) {
        this.#swdElementRef = element;
    }

    query = (query) => {
        const element = this.#swdElementRef.querySelector(query)
        if (!element) throw new ReferenceError(`query result is undefined`)
        return element;
    }

    hide = () => {
        this.#swdElementRef.setAttribute('hidden', 'true');
        return this.#swdElementRef;
    }

    show = () => { 
        this.#swdElementRef.removeAttribute('hidden');
        return this.#swdElementRef;
    }

    isHidden = () => {
        return this.#swdElementRef.hasAttribute('hidden');
    }

    toggle = () => {
        if (this.isHidden()) this.show();
        else this.hide();
        return this.#swdElementRef;
    }

    commentExpose = () => {
        this.#swdElementRef.innerHTML = this.#swdElementRef.innerHTML.replace('<!--', '').replace('-->', '');
        this.show();
        return this.#swdElementRef;
    }

    commentCover = () => {
        this.hide();
        this.#swdElementRef.innerHTML = '<!--' + this.#swdElementRef.innerHTML + '-->';
        return this.#swdElementRef;
    }

    isCommentHidden = () => {
        return this.#swdElementRef.innerHTML.trim().startsWith('<!--') && this.#swdElementRef.innerHTML.trim().endsWith('-->');
    }

    commentToggle = () => {
        if (this.isCommentHidden()) this.commentExpose();
        else this.commentCover();
        return this.#swdElementRef;
    }

    writeObject = (object) => {
        const nameElementsToFilter = [this.#swdElementRef, ...this.#swdElementRef.querySelectorAll('*')];
        for (const element of swd.filterElementsByAttributeName('name', nameElementsToFilter)) {
            const parts = element.key.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
            const value = parts.reduce((accessor, key) => {
                const numericKey = Number(key);
                if (Array.isArray(accessor) && !isNaN(numericKey)) {
                    return accessor[numericKey];
                }
                return accessor && accessor[key] !== undefined ? accessor[key] : undefined;
            }, object);
            element.value = value ? value : '';
        }
        const bindElementsToFilter = [this.#swdElementRef, ...this.#swdElementRef.querySelectorAll('*')];
        for (const element of swd.filterElementsByAttributeName('bind', bindElementsToFilter)) {
            element.value = new Function(...Object.keys(object), `return ${element.key}`)(...Object.values(object));
        }
        return this.#swdElementRef;
    }

    readObject = (object) => {
        const elementsToFilter = [this.#swdElementRef, ...this.#swdElementRef.querySelectorAll('*')];
        for (const element of swd.filterElementsByAttributeName('name', elementsToFilter)) {
            const value = element.value.length !== 0 ? element.value : undefined;
            const parts = element.key.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
            if (!object) object = isNaN(parts[0]) ? {} : []
            parts.reduce((accessor, key, index) => {
                const numericKey = Number(key);
                if (index === parts.length - 1) {
                    if (Array.isArray(accessor) && !isNaN(numericKey)) {
                        accessor[numericKey] = value;
                    } else {
                        accessor[key] = value;
                    }
                } else {
                    if (Array.isArray(accessor) && !isNaN(numericKey)) {
                        if (!accessor[numericKey]) accessor[numericKey] = {};
                        return accessor[numericKey];
                    } else {
                        if (accessor[key] === undefined || typeof accessor[key] !== 'object') {
                            accessor[key] = isNaN(Number(parts[index + 1])) ? {} : [];
                        }
                        return accessor[key];
                    }
                }
            }, object);
        }
        return object;
    }

}

class SwdComponent extends HTMLElement {

    #events = [];
    #observer;

    constructor() {
        super();
        this.#observer = new MutationObserver((mutations, observer) => {
            this.swdOnUpdate([...mutations]);
        })
        this.#observer.observe(this, { attributes: true, childList: true, subtree: false });
        swd.doAfterRendered(() => this.swdAfterRendered());
    }

    connectedCallback() {
        this.swdOnInit();
    }

    disconnectedCallback() {
        this.swdOnDestroy();
        for (const eventHolder of this.#events) {
            eventHolder.target.removeEventListener(eventHolder.event, eventHolder.action);
        }
        this.#observer.disconnect();
    }

    swdOnInit() {}
    swdAfterRendered() {}
    swdOnUpdate(mutation) {}
    swdOnDestroy() {}

    swdRegisterManagedEvent(target, event, action) {
        this.#events.push({ target, event, action });
        target.addEventListener(event, action);
    }

}

class SwdNavigation extends SwdComponent {

    static #shownNavigation = undefined;
    static #ignoreNextHide = false;
    static #yScroll = 0;

    show() {
        SwdNavigation.autoHide();
        SwdNavigation.#shownNavigation = this;
        this.setAttribute('shown', 'true');
        SwdNavigation.#ignoreNextHide = true;
    }

    hide() {
        this.removeAttribute('shown');
        SwdNavigation.#shownNavigation = undefined;
        this.scrollTop = 0;
    }

    isHidden() {
        return !this.hasAttribute('shown');
    }

    toggle() {
        if (this.isHidden()) this.show();
        else this.hide();
    }

    static autoHide(event) {
        if (!SwdNavigation.#shownNavigation) return;
        if (this.#ignoreNextHide) {
            this.#ignoreNextHide = false;
            return;
        }
        if (event && SwdNavigation.#shownNavigation.contains(event.target) && !(event.target.nodeName == 'A' && event.target.hasAttribute('href'))) {
            return;
        }
        SwdNavigation.#shownNavigation.hide();
        SwdNavigation.#shownNavigation = undefined;
    }

    static wheel(event) {
        if (!SwdNavigation.#shownNavigation) return;
        SwdNavigation.#shownNavigation.scrollTop += event.deltaY;
        event.preventDefault();
    }

    static touchStart(event) {
        if (!SwdNavigation.#shownNavigation) return;
        SwdNavigation.#yScroll = event.touches[0].clientY;
    }

    static touchMove(event) {
        if (!SwdNavigation.#shownNavigation) return;
        const deltaY = SwdNavigation.#yScroll - event.touches[0].clientY;
        SwdNavigation.#shownNavigation.scrollTop += deltaY;
        SwdNavigation.#yScroll = event.touches[0].clientY;
        event.preventDefault();
    }

}

class SwdInput extends SwdComponent {

    #INPUT_EVENT = () => { this.#updateIcon(); this.#INPUT_EVENT; }
    #INPUT_ICON_EVENT = () => this.#input?.focus();
    #INPUT_RESET_ICON_EVENT = () => { this.#input?.focus(); if (this.#input) this.#input.value = ''; this.#input.dispatchEvent(new Event('input', { bubbles: true })); }

    #input;
    #inputIcon;
    #inputResetIcon;
    #selfUpdateQueue = 0;

    swdOnUpdate() {
        if (this.#selfUpdateQueue-- > 0) return;
        const input = this.querySelector('input');
        const inputIcon = this.querySelector('[swd-input-icon]');
        const inputResetIcon = this.querySelector('[swd-input-reset-icon]');
        if (input !== this.input) {
            this.#input?.removeEventListener('input',this.#INPUT_EVENT);
            input?.addEventListener('input', this.#INPUT_EVENT);
            this.#input = input;
        }
        if (inputIcon !== this.inputIcon) {
            this.#inputIcon?.removeEventListener('click',this.#INPUT_ICON_EVENT);
            inputIcon?.addEventListener('click', this.#INPUT_ICON_EVENT);
            this.#inputIcon = inputIcon;
        }
        if (inputResetIcon !== this.inputResetIcon) {
            this.#inputResetIcon?.removeEventListener('click',this.#INPUT_RESET_ICON_EVENT);
            inputResetIcon?.addEventListener('click', this.#INPUT_RESET_ICON_EVENT);
            this.#inputResetIcon = inputResetIcon;
        }
        this.#updateValidation();
    }

    swdAfterRendered() {
        this.#updateIcon()
    }

    swdOnDestroy() {
        this.#input?.removeEventListener('input', this.#INPUT_EVENT);
    }

    #updateIcon() {
        const inputIcon = this.querySelector('[swd-input-icon]');
        const inputResetIcon = this.querySelector('[swd-input-reset-icon]');
        if (!inputIcon || !inputResetIcon) return;
        const value = this.#input.value.length > 0;
        if (value) inputIcon.setAttribute('hidden', 'true'); else inputIcon.removeAttribute('hidden')
        if (!value) inputResetIcon.setAttribute('hidden', 'true'); else inputResetIcon.removeAttribute('hidden')
    }

    #updateValidation() {
        if (!this.#input) return;
        const inputRange = this.querySelector('swd-input-range');
        if (inputRange) {
            inputRange.innerText = `${this.#input.value.length}`;
            this.#selfUpdateQueue++;
            const maxLength = this.#input.getAttribute('maxlength');
            if (maxLength) {
                inputRange.innerText += `/${maxLength}`;
                this.#selfUpdateQueue++;
            }
        }
        const inputError = this.querySelector('swd-input-error');
        if (inputError) {
            if (this.#input.checkValidity()) inputError.innerText = '';
            else inputError.innerText = this.#input.validationMessage;
            this.#selfUpdateQueue++;
        }
    }

}

class SwdDropdown extends SwdComponent {

    static #shownDropdowns = [];

    #dropdownInput;
    #dropdownSecondaryInput;
    #dropdownContent;
    #dropdownContentObserver;
    #selection;

    #INPUT_EVENT = event => {
        if (this.isHidden()) this.show();
        if (this.#selection && this.#dropdownInput && !this.#dropdownInput.hasAttribute('readonly') && this.#dropdownInput.type !== 'button') this.#selection.filter(event.target.value);
    }

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            if (this.#dropdownInput && this.#dropdownInput !== document.activeElement) this.#dropdownInput.focus()
            if (!this.#dropdownContent) return;
            if (this.isHidden() && !this.#dropdownContent.contains(event.target)) this.show();
            else if (this.isHidden() || !this.#dropdownContent?.contains(event.target)) this.hide();
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            if (event.key === 'Enter' && this.#selection && this.#dropdownInput && this.isHidden()) {
                event.preventDefault();
                this.show();
                return;
            }
            if (!this.#selection || this.isHidden()) return;
            switch (event.key) {
                case 'ArrowUp': case 'ArrowLeft':
                    this.#selection.previous();
                    event.preventDefault();
                    break;
                case 'ArrowDown': case 'ArrowRight':
                    this.#selection.next();
                    event.preventDefault();
                    break;
                case 'Enter':
                    event.preventDefault();
                    this.#selection.select();
                    this.hide();
                    break;
                case 'Escape':
                    this.#selection.reset();
                    this.hide();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.#dropdownInput && this.#dropdownInput.hasAttribute('readonly')) this.#dropdownInput.value = '';
                    break;
            }
        })
    }

    swdOnUpdate(event) {
        this.#dropdownInput?.removeEventListener('input', this.#INPUT_EVENT);
        const inputs = this.querySelectorAll('swd-dropdown input:not(swd-dropdown-content *)');
        if (inputs.length > 0) this.#dropdownInput = inputs[0];
        if (inputs.length > 1) this.#dropdownSecondaryInput = inputs[1];
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        this.#dropdownInput?.addEventListener('input', this.#INPUT_EVENT);
        if (this.#dropdownContent) {
            this.#selection = this.#dropdownContent.querySelector('swd-selection');
            this.#dropdownContentObserver?.disconnect();
            this.#dropdownContentObserver = new MutationObserver((mutations, observer) => {
                this.#setDropdownDirectionAndSize();
            })
            this.#dropdownContentObserver.observe(this, { attributes: false, childList: true, subtree: true });
        }
        if (this.#selection) {
            this.#selection.setOnSelect((text, value) => {
                if (this.#dropdownInput && this.#dropdownSecondaryInput) {
                    this.#dropdownInput.value = text;
                    this.#dropdownSecondaryInput.value = value;
                    this.#dropdownInput.dispatchEvent(new Event('input'));
                    this.#dropdownSecondaryInput.dispatchEvent(new Event('input'));
                } else if (this.#dropdownInput) {
                    this.#dropdownInput.value = value;
                    this.#dropdownInput.dispatchEvent(new Event('input'));
                }
                this.hide()
            })
        }
    }

    show() {
        if (!this.#dropdownContent) return;
        this.#dropdownContent.setAttribute('shown', 'true');
        this.#setDropdownDirectionAndSize()
        SwdDropdown.#shownDropdowns.push(this);
        if (this.#selection && this.#dropdownInput && !this.#dropdownInput.hasAttribute('readonly') && this.#dropdownInput.type !== 'button') this.#selection.filter(this.#dropdownInput.value)
    }

    hide() {
        if (!this.#dropdownContent) return;
        this.#dropdownContent.removeAttribute('shown');
        SwdDropdown.#shownDropdowns = SwdDropdown.#shownDropdowns.filter(entry => entry !== this);
    }

    isHidden() { 
        if (!this.#dropdownContent) return true;
        return !this.#dropdownContent.hasAttribute('shown');
    }

    toggle() {
        if (this.isHidden()) this.show();
        else this.hide();
    }

    #setDropdownDirectionAndSize() {
        Object.assign(this.#dropdownContent.style, { left: '', maxWidth: '', top: '', maxHeight: '' });
        const dropdownRect = this.getBoundingClientRect();
        this.#dropdownContent.style.minWidth = `${dropdownRect.width}px`;
        const contentRect = this.#dropdownContent.getBoundingClientRect();
        if (this.#dropdownContent.hasAttribute('fixed')) {
            const style = {
                top: `${dropdownRect.bottom}px`,
                maxHeight: `${window.innerHeight - dropdownRect.bottom}px`,
                left: `${dropdownRect.left}px`,
                maxWidth: `${window.innerWidth - dropdownRect.left}px`
            }
            if (dropdownRect.bottom + contentRect.height > window.innerHeight && dropdownRect.top > window.innerHeight - dropdownRect.bottom) {
                const top = dropdownRect.top - contentRect.height
                style.top = `${top > 0 ? top : 0}px`;
                style.maxHeight = `${dropdownRect.top}px`;
            }
            if (dropdownRect.left + contentRect.width > window.innerWidth && dropdownRect.left > window.innerWidth - dropdownRect.right) {
                const left = dropdownRect.right - contentRect.width
                style.left = `${left > 0 ? left : 0}px`;
                style.maxWidth = `${dropdownRect.right}px`;
            }
            Object.assign(this.#dropdownContent.style, style);
        } else {
            const style = {
                bottom: `initial`,
                maxHeight: `${window.innerHeight - dropdownRect.bottom}px`,
                right: `initial`,
                maxWidth: `${window.innerWidth - dropdownRect.left}px`
            }
            if (dropdownRect.bottom + contentRect.height > window.innerHeight && dropdownRect.top > window.innerHeight - dropdownRect.bottom) {
                style.bottom = '100%';
                style.maxHeight = `${dropdownRect.top}px`;
            }
            if (dropdownRect.left + contentRect.width > window.innerWidth && dropdownRect.left > window.innerWidth - dropdownRect.right) {
                style.right = '0';
                style.maxWidth = `${dropdownRect.right}px`;
            }
            Object.assign(this.#dropdownContent.style, style);
        }
        
    }

    static resizeAllDropdowns() {
        for (const dropdown of SwdDropdown.#shownDropdowns) dropdown.#setDropdownDirectionAndSize();
    }

    static autoHide(event) {
        for (const dropdown of SwdDropdown.#shownDropdowns) {
            if (event && dropdown.contains(event.target) && !(event.target.nodeName == 'A' && event.target.hasAttribute('href'))) {
                return;
            }
            dropdown.hide();
        }
    }

}

class SwdSelection extends SwdComponent {

    #selectionChangeAction;
    #elements = new Set();
    #selected;
    value;

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => this.select(event.target));
    }

    next() { this.#nextOrPrevious(true, false) }
    previous() { this.#nextOrPrevious(false, false) }

    #nextOrPrevious(next, first) {
        if (this.children.length === 0) return;
        const original = this.querySelector('[selected]');
        let target = first ? undefined : original;
        let i = 0
        do {
            let nextTarget = target ? (next ? target.nextElementSibling : target.previousElementSibling) : (next ? this.firstElementChild : this.lastElementChild);
            if (!nextTarget) nextTarget = next ? this.firstElementChild : this.lastElementChild
            target = nextTarget;
        } while ((target.nodeName !== 'A' || target.hasAttribute('hidden')) && i++ < this.children.length);
        original?.removeAttribute('selected');
        target.setAttribute('selected', 'true');
        const content = this.parentElement;
        const contentRect = content.getBoundingClientRect();
        const taregtRect = target.getBoundingClientRect();
        const targetOffset = target.offsetTop;
        if (targetOffset + taregtRect.height > content.scrollTop + contentRect.height) content.scrollTop = targetOffset + taregtRect.height - contentRect.height;
        else if (targetOffset < content.scrollTop) content.scrollTop = targetOffset;
    }

    reset() {
        const target = this.querySelector('[selected]');
        if (!target || target === this.#selected) return;
        target.removeAttribute('selected');
        this.#selected.setAttribute('selected', 'true');
    }

    select(target) {
        let targetToSelect = target ? target : this.querySelector('[selected]');
        while(targetToSelect && targetToSelect !== this && targetToSelect.tagName !== 'A') targetToSelect = targetToSelect.parentNode;
        if (!targetToSelect || targetToSelect.nodeName !== 'A' || targetToSelect.hasAttribute('hidden')) return;
        this.#selected?.removeAttribute('selected');
        this.#selected = targetToSelect;
        this.#selected.setAttribute('selected', 'true');
        this.value = this.#selected.getAttribute('value') || this.#selected.innerText;
        const name = this.#selected.getAttribute('display') || this.#selected.innerText;
        const event = new Event('select', { bubbles: true });
        event.value = this.value;
        event.name = name;
        this.#selected.dispatchEvent(event);
        this.#selectionChangeAction?.(name, this.value);
    }

    setOnSelect(action) {
        this.#selectionChangeAction = action;
    }

    filter(text) {
        const event = new Event("filter", { cancelable: true, target: this });
        if (this.hasAttribute('onfilter')) {
            new Function('event', this.getAttribute('onfilter')).call(this, event);
        }
        if (event.returnValue) {
            this.dispatchEvent(event);
        }
        if (!event.returnValue) return;
        if (!text || text == '') {
            Array.from(this.children).forEach(element => element.removeAttribute('hidden'));
            return;
        }
        const normalizedText = text.toLowerCase().replace(/[^\w\d\s]/gm, '');
        for (const element of this.children) {
            let isElementVisible = false;
            const elementTextParts = [];
            let currentTextPart = element.innerHTML.toLowerCase().replace(/<\/?[^>]*>/g, ' ').replace(/[^\w\d\s]/gm, '').replace(/\s{2,}/g, ' ');
            elementTextParts.push(currentTextPart);
            while (currentTextPart.indexOf(' ') !== -1) {
                currentTextPart = currentTextPart.substring(currentTextPart.indexOf(' ') + 1);
                elementTextParts.push(currentTextPart);
            }
            for (const searchString of elementTextParts) {
                if (!searchString.startsWith(normalizedText)) continue;
                isElementVisible = true
                break;
            }
            if (isElementVisible) element.removeAttribute('hidden');
            else element.setAttribute('hidden', 'true');
        }
        this.#nextOrPrevious(true, true);
    }
    
}

class SwdDialog extends SwdComponent {

    static #shownDialog;
    
    show() {
        if (SwdDialog.#shownDialog) SwdDialog.#shownDialog.hide();
        SwdDialog.#shownDialog = this;
        this.setAttribute('shown', 'true');
    }

    hide() {
        SwdDialog.#shownDialog = undefined;
        this.removeAttribute('shown');
    }

    isHidden() {
        return !this.hasAttribute('shown');
    }

    toggle() {
        if (this.isHidden()) this.show();
        else this.hide();
    }

    static hide() {
        SwdDialog.#shownDialog.hide();
    }

}

class SwdCode extends SwdComponent {

    #shadowDom;

    constructor() { 
        super();
        this.#shadowDom = this.attachShadow({ mode: 'open' });
    }

    swdOnUpdate() { this.#highlight() }

    #highlight() {
        switch (this.getAttribute('swd-code-language')) {
            case 'html': this.#shadowDom.innerHTML = this.#highlightHtml(this.innerHTML);
                break;
            case 'css': this.#shadowDom.innerHTML = this.#highlightCss(this.innerHTML);
                break;
            default: this.#shadowDom.innerHTML = this.innerHTML;
        }
        this.#shadowDom.innerHTML = this.#shadowDom.innerHTML + '<style>@import "/SimpleWebDesign/resources/style.css"</style>';
    }

    #highlightHtml(string) {
        let codeString = '';
        let tag = false;
        let attribute = false;
        let value = false;
        let comment = false;
        let lastAddedIndex = 0;
        for (let i = 0; i < string.length; i++) {
            if (!tag && !comment && i + 3 < string.length && string.substring(i, i + 4) == '&lt;' && !(i + 7 < string.length && string.substring(i, i + 7) == '&lt;!--')) {
                codeString += string.substring(lastAddedIndex, i) + '<span class="blue-text">&lt;';
                tag = true;
                i += 4;
                lastAddedIndex = i;
            } else if (tag && i + 3 < string.length && string.substring(i, i + 4) == '&gt;') {
                codeString += string.substring(lastAddedIndex, i);
                if (attribute) codeString += '</span>';
                codeString += '&gt;</span>';
                tag = false;
                attribute = false;
                i += 3;
                lastAddedIndex = i + 1;
            } else if (tag && !comment && !attribute && string.charAt(i) == ' ') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="aqua-text">';
                attribute = true;
                lastAddedIndex = i;
            } else if (tag && !comment && attribute && string.charAt(i) == '"') {
                codeString += value ? string.substring(lastAddedIndex, i) + '"</span>' : string.substring(lastAddedIndex, i) + '<span class="green-text">"';
                value = !value;
                lastAddedIndex = i + 1;
            } else if (!tag && !comment && i + 7 < string.length && string.substring(i, i + 7) == '&lt;!--') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="grey-text">&lt;!--';
                comment = true;
                i += 7;
                lastAddedIndex = i;
            } else if (comment && i + 6 < string.length && string.substring(i, i + 6) == '--&gt;') {
                codeString += string.substring(lastAddedIndex, i) + '--&gt;</span>';
                comment = false;
                i += 6;
                lastAddedIndex = i;
            }
        }
        codeString += string.substring(lastAddedIndex, string.length);
        return codeString;
    }

    #highlightCss(string) {
        let codeString = '';
        let key = false;
        let value = false;
        let comment = false;
        let lastAddedIndex = 0;
        for (let i = 0; i < string.length; i++) {
            if (!comment && !key && string.charAt(i) == '{') {
                codeString += string.substring(lastAddedIndex, i) + '</span>{<span class="aqua-text">';
                key = true;
                lastAddedIndex = ++i;
            } else if (!comment && key && string.charAt(i) == ':') {
                codeString += string.substring(lastAddedIndex, i) + '</span>:<span class="green-text">';
                value = true;
                lastAddedIndex = ++i;
            } else if (!comment && key && string.charAt(i) == '}') {
                codeString += string.substring(lastAddedIndex, i) + '</span>}<span class="blue-text">';
                key = false;
                value = false;
                lastAddedIndex = ++i;
            } else if (!comment && value && string.charAt(i) == ';') {
                codeString += string.substring(lastAddedIndex, i) + '</span>;<span class="aqua-text">';
                key = true;
                value = false;
                lastAddedIndex = ++i;
            } else if (!comment && i + 1 < string.length && string.substring(i, i + 2) == '/*') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="grey-text">/*';
                comment = true;
                i += 2;
                lastAddedIndex = i;
            } else if (comment && i + 1 < string.length && string.substring(i, i + 2) == '*/') {
                codeString += string.substring(lastAddedIndex, i) + '*/</span>';
                comment = false;
                i += 2;
                lastAddedIndex = i;
            }
        }
        codeString += string.substring(lastAddedIndex, string.length - 1);
        return '<span class="blue-text">' + codeString + '</span>';
    }

}

customElements.define('swd-navigation', SwdNavigation);
customElements.define('swd-input', SwdInput);
customElements.define('swd-dropdown', SwdDropdown);
customElements.define('swd-selection', SwdSelection);
customElements.define('swd-dialog', SwdDialog);
customElements.define('swd-code', SwdCode);