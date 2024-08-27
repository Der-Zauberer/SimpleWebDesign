class Swd {

    #loaded = false;
    #afterRenderedActions = [];

    constructor() {
        document.addEventListener('readystatechange', event => { 
            if (event.target.readyState === 'interactive') {
                this.#loaded = true;
                this.#afterRenderedActions.forEach(action => action.call());
            }
        })
    }

    from(element) {
        return new SwdElementRef(element);
    }

    query(query) {
        return new SwdElementRef(document.querySelector(query));
    }

    doAfterRendered(action) {
        if (this.#loaded) action.call();
        else this.#afterRenderedActions.push(action);
    }

}

swd = new Swd();
window.addEventListener('resize', () => { SwdDropdown.resizeAllDropdowns(); SwdNavigation.autoHide() });
document.addEventListener('scroll', () => SwdDropdown.resizeAllDropdowns());
document.addEventListener('click', (event) => { SwdNavigation.autoHide(event); SwdDropdown.autoHide(event); });
document.addEventListener('input', (event) => event.target.setAttribute('dirty', 'true'));

class SwdElementRef {

    #element

    constructor(element) {
        this.#element = element;
    }

    query(query) {
        return new SwdElementRef(this.#element.querySelector(query))
    }

    hide() {
        if (this.#element.hide) {
            this.#element.hide();
            return this;
        }
        this.#element.setAttribute('hidden', 'true')
        return this;
    }

    show() { 
        this.#element.show ? this.#element.show() : this.#element.removeAttribute('hidden');
        return this;
    }

    isHidden() {
        return this.#element.isHidden ? this.#element.isHidden() : this.#element.hasAttribute('hidden');
    }

    toggle() {
        if (this.#element.toggle) {
            this.#element.toggle();
            return this;
        }
        if (this.isHidden()) this.show();
        else this.hide();
        return this;
    }

    commentExpose() {
        if (!this.isCommentHidden()) return this;
        this.#element.innerHTML = this.#element.innerHTML.replace('<!--', '').replace('-->', '');
        this.show();
        return this;
    }

    commentCover() {
        if (this.isCommentHidden()) return this;
        this.hide();
        this.#element.innerHTML = '<!--' + this.#element.innerHTML + '-->';
        return this;
    }

    isCommentHidden() {
        console.log(this.#element.innerHTML.trim().startsWith('<!--'))
        console.log(this.#element.innerHTML.trim().endsWith('-->'))
        console.log(this.innerHTML)
        return this.#element.innerHTML.trim().startsWith('<!--') && this.#element.innerHTML.trim().endsWith('-->');
    }

    commentToggle() {
        if (this.isCommentHidden()) this.commentExpose();
        else this.commentCover();
        return this;
    }

    get(property) {
        console.log(property)
        return this.#element[property];
    }

}

class SwdComponent extends HTMLElement {

    #events = [];
    #observer;

    constructor() {
        super();
        this.#observer = new MutationObserver((mutationList, observer) => {
            this.swdOnUpdate([...mutationList]);
        })
        this.#observer.observe(this, { attributes: true, childList: true, subtree: false });
        swd.doAfterRendered(() => this.swdAfterRendered());
    }

    connectedCallback() {
        this.swdOnInit();
    }

    disconnectedCallback() {
        this.swdOnDestroy();
        for (eventHolder of this.#events) {
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
    #selection;

    #INPUT_EVENT = event => { 
        if (this.isHidden()) this.show()(); 
        if (this.#selection && this.#dropdownInput && !this.#dropdownInput.hasAttribute('readonly')) this.#selection.filter(event.target.value); 
        this.#setDropdownDirectionAndSize(); 
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
            if (!this.#selection || !this.isHidden()) return;
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
        if (this.#dropdownInput) {
            this.#dropdownInput.removeEventListener('input', this.#INPUT_EVENT);
        }
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        this.#dropdownInput = this.querySelector('swd-dropdown input:not(swd-dropdown-content *)');
        if (this.#dropdownInput) {
            this.#dropdownInput.addEventListener('input', this.#INPUT_EVENT);
        }
        if (this.#dropdownContent) this.#selection = this.#dropdownContent.querySelector('swd-selection');
        if (this.#selection && this.#dropdownInput) {
            this.#selection.setOnSelect((text, value) => {
                this.#dropdownInput.value = value;
                this.#dropdownInput.dispatchEvent(new Event("input"));
                this.#dropdownInput.dispatchEvent(new Event("select"));
            })
        }
    }

    show() {
        if (!this.#dropdownContent) return;
        this.#dropdownContent.setAttribute('shown', 'true');
        this.#setDropdownDirectionAndSize();
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
        this.swdRegisterManagedEvent(this, 'click', event => {
            this.select(event.target);
        })
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
        if (this.#selectionChangeAction) this.#selectionChangeAction(this.selected.innerText, this.value);
    }

    setOnSelect(action) {
        this.#selectionChangeAction = action;
    }

    filter(text) {
        if (!text || text == '') {
            Array.from(this.children).forEach(element => element.removeAttribute('hidden'));
            return;
        }
        const normalizedText = text.toLowerCase().replace(/[^\w\d\s]/gm, '');
        for (const element of this.children) {
            let isElementVisible = false;
            const elementTextParts = [];
            let currentTextPart = element.innerHTML.toLowerCase().replace(/[^\w\d\s]/gm, '');
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