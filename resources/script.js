class Swd {

    #loaded = false;
    #afterRenderedActions = [];

    #fallbackLanguage;
    #languages = new Map();
    #translation = new Map();

    constructor() {
        document.addEventListener('readystatechange', event => {
            if (event.target.readyState === 'interactive') {
                this.#loaded = true;
                this.#afterRenderedActions.forEach(action => action.call());
            }
        })
        new MutationObserver((mutations, observer) => {
            if (this.#translation.length === 0) return;
            for (const mutation of mutations) {
                if (mutation.target.swdIgnoreNextI18nUpdate) {
                    mutation.target.swdIgnoreNextI18nUpdate = false;
                    return;
                }
                this.translate([mutation.target]);
            }
        }).observe(document, { attributes: true, childList: true, subtree: true });
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
        if (this.#loaded) action.call();
        else this.#afterRenderedActions.push(action);
    }

    configureLanguages(languages) {
        for (const language of languages.languages) {
            this.#languages.set(language.locale, language.src);
        }
        this.#fallbackLanguage = languages.fallback;
    }

    setLanguage(locale) {
        const src = this.#languages.get(locale) || this.#languages.get(this.#fallbackLanguage);
        if (src == undefined) return;
        fetch(src).then(response => response.text()).then(text => {
            this.#translation.clear();
            const lines = text.split(/\r?\n/gm);
            for (const line of lines) {
                const translation = line.split('=');
                this.#translation.set(translation[0].trim(), translation[1].trim());
                if (this.#loaded) this.translate(document.querySelectorAll('*'))
            }
        });
    }

    translate(elements) {
        for (const element of this.filterElementsByAttributeName('i18n', elements)) {
            element.value = this.#translation.get(element.key) || element.key;
            element.element.swdIgnoreNextI18nUpdate = true;
        }
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

swd = new Swd();
window.addEventListener('resize', () => { SwdDropdown.resizeAllDropdowns(); SwdNavigation.autoHide() });
document.addEventListener('scroll', () => SwdDropdown.resizeAllDropdowns());
document.addEventListener('click', (event) => { SwdNavigation.autoHide(event); SwdDropdown.autoHide(event); });
document.addEventListener('input', (event) => event.target.setAttribute('dirty', 'true'));

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

}

class SwdInput extends SwdComponent {

    #input;
    #selfUpdateQueue = 0;

    swdOnUpdate() {
        if (this.#selfUpdateQueue-- > 0) return;
        const input = this.querySelector('input');
        if (input !== this.input) {
            if (this.#input) this.#input.removeEventListener('input', event => this.#updateValidation());
            if (input) input.addEventListener('input', event => this.#updateValidation());
            this.#input = input;
        }
        this.#updateValidation();
    }

    swdOnDestroy() {
        if (this.#input) this.#input.removeEventListener('input', event => this.#updateValidation());
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
        if (this.#selection && this.#dropdownInput && !this.#dropdownInput.hasAttribute('readonly')) this.#selection.filter(event.target.value);
    }

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            const canBeHidden = (event) => {
                if (this.isHidden()) return;
                if (this.#selection) {
                    return this.#selection.contains(event.target);
                } else {
                    return !this.#dropdownContent || !this.#dropdownContent.contains(event.target);
                }
            }
            if (!this.#dropdownContent) return;
            if (this.isHidden()) this.show();
            else if (canBeHidden(event)) this.hide();
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            if (this.#selection && this.#dropdownInput && this.isHidden() && event.key === 'Enter') {
                event.preventDefault();
                this.hide();
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
                    if (this.isHidden()) {
                        this.show();
                    } else {
                        this.#selection.select();
                        this.hide();
                    }
                    break;
                case 'Escape':
                    if (this.#dropdownInput) document.activeElement.blur();
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
        if (this.#dropdownInput) {
            this.#dropdownInput.removeEventListener('input', this.#INPUT_EVENT);
        }
        const inputs = this.querySelectorAll('swd-dropdown input:not(swd-dropdown-content *)');
        if (inputs.length > 0) this.#dropdownInput = inputs[0];
        if (inputs.length > 1) this.#dropdownSecondaryInput = inputs[1];
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        if (this.#dropdownInput) {
            this.#dropdownInput.addEventListener('input', this.#INPUT_EVENT);
        }
        if (this.#dropdownContent) {
            this.#selection = this.#dropdownContent.querySelector('swd-selection');
            this.#dropdownContentObserver?.disconnect();
            this.#dropdownContentObserver = new MutationObserver((mutations, observer) => {
                this.#setDropdownDirectionAndSize();
            })
            this.#dropdownContentObserver.observe(this, { attributes: false, childList: true, subtree: true });
        }
        if (this.#selection && this.#dropdownInput) {
            this.#selection.setOnSelect((text, value) => {
                if (this.#dropdownSecondaryInput) {
                    this.#dropdownInput.value = text;
                    this.#dropdownSecondaryInput.value = value;
                    this.#dropdownInput.dispatchEvent(new Event("input"));
                    this.#dropdownSecondaryInput.dispatchEvent(new Event("input"));
                    this.#dropdownInput.dispatchEvent(new Event("select"));
                    this.#dropdownSecondaryInput.dispatchEvent(new Event("select"));
                } else {
                    this.#dropdownInput.value = value;
                    this.#dropdownInput.dispatchEvent(new Event("input"));
                    this.#dropdownInput.dispatchEvent(new Event("select"));
                }
            })
        }
    }

    show() {
        if (!this.#dropdownContent) return;
        this.#dropdownContent.setAttribute('shown', 'true');
        SwdDropdown.#shownDropdowns.push(this);
        if (this.#selection && this.#dropdownInput && !this.#dropdownInput.hasAttribute('readonly')) this.#selection.filter(this.#dropdownInput.value)
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
        this.#dropdownContent.style.maxHeight = '';
        this.#dropdownContent.classList.remove('swd-dropdown-content-right');
        this.#dropdownContent.classList.remove('swd-dropdown-content-up');
        const dropdownRect = this.getBoundingClientRect();
        const contentRect = this.#dropdownContent.getBoundingClientRect();
        if (contentRect.right > window.innerWidth) this.#dropdownContent.classList.add('swd-dropdown-content-right');
        if (contentRect.bottom > window.innerHeight) {
            if (dropdownRect.top - contentRect.height > window.innerHeight - contentRect.bottom) {
                if (dropdownRect.top - contentRect.height < 0) {
                    this.#dropdownContent.style.maxHeight = `${dropdownRect.top}px`;
                }
                this.#dropdownContent.classList.add('swd-dropdown-content-up');
            } else {
                this.#dropdownContent.style.maxHeight = `${window.innerHeight - contentRect.top}px`;
            }
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
        do {
            const nextTarget = target ? (next ? target.nextElementSibling : target.previousElementSibling) : (next ? this.firstElementChild : this.lastElementChild);
            if (!nextTarget) return;
            target = nextTarget;
        } while (target.nodeName !== 'A' || target.hasAttribute('hidden'));
        if (original) original.removeAttribute('selected');
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
        if (!target || !this.#selected || target === this.#selected) return;
        target.removeAttribute('selected');
        this.#selected.addAttribute('selected', 'true');
    }

    select(target) {
        const targetToSelect = target ? target : this.querySelector('[selected]');
        if (!targetToSelect || targetToSelect.nodeName !== 'A' || targetToSelect.hasAttribute('hidden')) return;
        this.selected = targetToSelect;
        this.value = this.selected.getAttribute('value') || this.selected.innerText;
        const name = this.selected.getAttribute('display') || this.selected.innerText;
        this.dispatchEvent(new Event("select"));
        if (this.#selectionChangeAction) this.#selectionChangeAction(name, this.value);
    }

    setOnSelect(action) {
        this.#selectionChangeAction = action;
    }

    filter(text) {
        const event = new Event("filter", { cancelable: true, target: this });
        if (this.hasAttribute('onfilter')) {
            eval(this.getAttribute('onfilter'));
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