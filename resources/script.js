class Swd {

    #loaded = false
    #afterRenderedActions = []

    constructor() {
        document.addEventListener('readystatechange', event => { 
            if (event.target.readyState === 'interactive') {
                this.#loaded = true;
                this.#afterRenderedActions.forEach(action => action.call())
            }
        })
    }

    doAfterRendered(action) {
        if (this.#loaded) action.call()
        else this.#afterRenderedActions.push(action)
    }

    setAttribute(id, attribute, value) {
        const target = document.querySelector(`#${id}`)
        if (target) target.setAttribute(attribute, value)
    }

    hide(element) { element.setAttribute('hidden', 'true') }
    show(element) { element.removeAttribute('hidden') }
    isHidden(element) { return element.hasAttribute('hidden') }

    toggle(element) {
        if (this.isHidden(element)) this.show(element)
        else this.hide(element)
    }

    commentExpose(element) { 
        if (this.isHidden(element))  {
            element.innerHTML = element.innerHTML.replace('<!--', '').replace('-->', '');
            this.show(element);
        }
    }

    commentCover(element) {
        if (!this.isHidden(element))  {
            this.hide(element)
            element.innerHTML = '<!--' + element.innerHTML + '-->';
        }
    }

    commentToggle(element) {
        if (this.isHidden(element)) this.commentExpose(element) 
        else this.commentCover(element)
    }

    trigger(target) {
        if (!target) return
        [...target.attributes].filter(attribute => attribute.name.startsWith('swd-')).forEach(attribute => {
            switch (attribute.name) {
                case 'swd-hide':
                    this.#asElement(attribute.value, element => this.hide(element))
                    break
                case 'swd-show':
                    this.#asElement(attribute.value, element => this.show(element))
                    break
                case 'swd-toggle':
                    this.#asElement(attribute.value, element => this.toggle(element))
                    break
                case 'swd-navigation-open': this.#asElement(attribute.value, navigation => navigation.open()) 
                    break
                case 'swd-navigation-close': this.#asElement(attribute.value, navigation => navigation.close())
                    break
                case 'swd-navigation-toggle': this.#asElement(attribute.value, navigation => navigation.toggle())
                    break
                case 'swd-dialog-open': this.#asElement(attribute.value, dialog => dialog.open()) 
                    break
                case 'swd-dialog-close': SwdDialog.close()
                    break
                case 'swd-dialog-toggle': this.#asElement(attribute.value, dialog => dialog.toggle())
                    break
                case 'swd-comment-expose': this.#asElement(attribute.value, element => swd.commentExpose(element))
                    break
                case 'swd-comment-cover': this.#asElement(attribute.value, element => swd.commentCover(element))
                        break
                case 'swd-comment-toggle': this.#asElement(attribute.value, element => swd.commentToggle(element))
                    break
                default: 
                    break
            }
        })
    }

    #asElement(id, action) {
        const element = document.querySelector(`#${id}`)
        if (element) action(element)
    }

}

swd = new Swd()
document.addEventListener('click', (event) => swd.trigger(event.target))
document.addEventListener('input', (event) => event.target.setAttribute('dirty', 'true'))

class SwdComponent extends HTMLElement {

    #events = []
    #observer;

    constructor() {
        super()
        this.#observer = new MutationObserver((mutationList, observer) => {
            [...mutationList].forEach(mutation => {
                
                this.swdOnUpdate(mutation)
            })
        })
        this.#observer.observe(this, { attributes: true, childList: true, subtree: true })
        swd.doAfterRendered(() => this.swdAfterRendered())
    }

    connectedCallback() {
        this.swdOnInit()
    }

    disconnectedCallback() {
        this.swdOnDestroy()
        for (eventHolder in this.#events) {
            eventHolder.target.removeEventListener(eventHolder.event, eventHolder.action)
        }
        this.#observer.disconnect()
    }

    swdOnInit() {}
    swdAfterRendered() {}
    swdOnUpdate(mutation) {}
    swdOnDestroy() {}

    swdRegisterManagedEvent(target, event, action) {
        this.#events.push({ target, event, action })
        target.addEventListener(event, action)
    }

}

class SwdNavigation extends SwdComponent {

    open() { this.setAttribute('shown', 'true') }
    close() { this.removeAttribute('shown') }
    isOpen() { this.hasAttribute('shown') }

    toggle() {
        if (this.isOpen()) this.close()
        else this.open()
    }

}

class SwdInput extends SwdComponent {

    #input
    #selfUpdateQueue = 0

    swdOnUpdate() {
        if (this.#selfUpdateQueue-- > 0) return
        const input = this.querySelector('input')
        if (input !== this.input) {
            if (this.#input) this.#input.removeEventListener('input', event => this.#updateValidation())
            if (input) input.addEventListener('input', event => this.#updateValidation())
            this.#input = input
        }
        this.#updateValidation()
    }

    swdOnDestroy() {
        if (this.#input) this.#input.removeEventListener('input', event => this.#updateValidation())
    }

    #updateValidation() {
        if (!this.#input) return
        const inputRange = this.querySelector('swd-input-range')
        if (inputRange) {
            inputRange.innerText = `${this.#input.value.length}`
            this.#selfUpdateQueue++;
            const maxLength = this.#input.getAttribute('maxlength')
            if (maxLength) {
                inputRange.innerText += `/${maxLength}`
                this.#selfUpdateQueue++;
            }
        }
        const inputError = this.querySelector('swd-input-error')
        if (inputError) {
            if (this.#input.checkValidity()) inputError.innerText = ''
            else inputError.innerText = this.#input.validationMessage
            this.#selfUpdateQueue++;
        }
    }

}

class SwdDropdown extends SwdComponent {

    #dropdownContent;
    #selection;

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            this.#dropdownContent = this.querySelector('swd-dropdown-content');
            if (!this.#dropdownContent) return
            if (event.target.hasAttribute('swd-dropdown-open')) this.open()
            else if (event.target.hasAttribute('swd-dropdown-close')) this.close()
            else if (event.target.hasAttribute('swd-dropdown-toggle')) this.toggle()
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            if (!this.#selection) return
            if (event.key === 'ArrowUp') { 
                this.#selection.previous()
                event.preventDefault()
            } else if (event.key === 'ArrowDown') {
                this.#selection.next()
                event.preventDefault()
            } else if (event.key === 'Enter') {
                this.#selection.select()
                event.preventDefault()
            }
        })
    }

    swdOnUpdate() {
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        if (this.#dropdownContent) this.#selection = this.#dropdownContent.querySelector('swd-selection')
    }

    /*
    swdAfterRendered() {
        this.swdRegisterManagedEvent(this, 'keydown', event => console.log(event))
        const toggleElement = this.querySelector('[swd-dropdown-toggle]');
        if (!toggleElement) return;
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        if (!this.#dropdownContent) return;
        this.#selection = this.querySelector('swd-selection')
        this.swdRegisterManagedEvent(toggleElement, 'keydown', event => {
            if (this.#selection) this.#selection.dispatchEvent(event)
        })
    }
        */

    open() { this.#dropdownContent.setAttribute('shown', 'true') }
    close() { this.#dropdownContent.removeAttribute('shown') }
    isOpen() { return this.#dropdownContent.hasAttribute('shown') }

    toggle() {
        if (this.isOpen()) this.close()
        else this.open()
    }

}

class SwdSelection extends SwdComponent {

    value

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            if (event.target != this) this.select(event.target)
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            if (event.key === 'ArrowUp') { 
                this.previous()
                event.preventDefault()
            } else if (event.key === 'ArrowDown') {
                this.next()
                event.preventDefault()
            } else if (event.key === 'Enter') {
                this.select()
                event.preventDefault()
            }
        })
    }

    #lightSelect(target) {
        const selected = this.querySelector('[selected]')
        if (selected === target) return
        if (selected) selected.removeAttribute('selected')
        target.setAttribute('selected', 'true')
    }

    #nextOrPrevious(next) {
        const selected = this.querySelector('[selected]')
        const target = selected ? (next ? selected.nextElementSibling : selected.previousElementSibling) : (next ? this.firstChild : this.lastChild)
        if (target && target.nodeName === 'A') this.#lightSelect(target)
    }

    next() { this.#nextOrPrevious(true) }
    previous() { this.#nextOrPrevious(false) }

    select() {
        const selected = this.querySelector('[selected]')
        this.value = selected ? selected.getAttribute('value') || selected.innerText : undefined
    }

}

class SwdDialog extends SwdComponent {

    static #openDialog
    
    open() {
        if (SwdDialog.#openDialog) SwdDialog.#openDialog.close()
        SwdDialog.#openDialog = this
        this.setAttribute('shown', 'true')
    }

    close() {
        SwdDialog.#openDialog = undefined
        this.removeAttribute('shown') 
    }

    isOpen() {
        return this.hasAttribute('shown')
    }

    toggle() {
        if (this.isOpen()) this.close()
        else this.open()
    }

    static close() {
        SwdDialog.#openDialog.close()
    }

}

class SwdCode extends SwdComponent {

    #shadowDom

    constructor() { 
        super()
        this.#shadowDom = this.attachShadow({ mode: 'open' })
    }

    swdOnUpdate() { this.#highlight() }

    #highlight() {
        switch (this.getAttribute('swd-code-language')) {
            case 'html': this.#shadowDom.innerHTML = this.#highlightHtml(this.innerHTML)
                break
            case 'css': this.#shadowDom.innerHTML = this.#highlightCss(this.innerHTML)
                break
            default: this.#shadowDom.innerHTML = this.innerHTML
        }
        this.#shadowDom.innerHTML = this.#shadowDom.innerHTML + '<style>@import "/SimpleWebDesign/resources/style.css"</style>'
    }

    #highlightHtml(string) {
        let codeString = ''
        let tag = false
        let attribute = false
        let value = false
        let comment = false
        let lastAddedIndex = 0
        for (let i = 0; i < string.length; i++) {
            if (!tag && !comment && i + 3 < string.length && string.substring(i, i + 4) == '&lt;' && !(i + 7 < string.length && string.substring(i, i + 7) == '&lt;!--')) {
                codeString += string.substring(lastAddedIndex, i) + '<span class="blue-text">&lt;'
                tag = true
                i += 4
                lastAddedIndex = i
            } else if (tag && i + 3 < string.length && string.substring(i, i + 4) == '&gt;') {
                codeString += string.substring(lastAddedIndex, i)
                if (attribute) codeString += '</span>'
                codeString += '&gt;</span>'
                tag = false
                attribute = false
                i += 3
                lastAddedIndex = i + 1;
            } else if (tag && !comment && !attribute && string.charAt(i) == ' ') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="aqua-text">'
                attribute = true
                lastAddedIndex = i
            } else if (tag && !comment && attribute && string.charAt(i) == '"') {
                codeString += value ? string.substring(lastAddedIndex, i) + '"</span>' : string.substring(lastAddedIndex, i) + '<span class="green-text">"'
                value = !value
                lastAddedIndex = i + 1
            } else if (!tag && !comment && i + 7 < string.length && string.substring(i, i + 7) == '&lt;!--') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="grey-text">&lt;!--'
                comment = true
                i += 7
                lastAddedIndex = i
            } else if (comment && i + 6 < string.length && string.substring(i, i + 6) == '--&gt;') {
                codeString += string.substring(lastAddedIndex, i) + '--&gt;</span>'
                comment = false
                i += 6
                lastAddedIndex = i
            }
        }
        codeString += string.substring(lastAddedIndex, string.length)
        return codeString
    }

    #highlightCss(string) {
        let codeString = ''
        let key = false
        let value = false
        let comment = false
        let lastAddedIndex = 0
        for (let i = 0; i < string.length; i++) {
            if (!comment && !key && string.charAt(i) == '{') {
                codeString += string.substring(lastAddedIndex, i) + '</span>{<span class="aqua-text">'
                key = true
                lastAddedIndex = ++i
            } else if (!comment && key && string.charAt(i) == ':') {
                codeString += string.substring(lastAddedIndex, i) + '</span>:<span class="green-text">'
                value = true
                lastAddedIndex = ++i
            } else if (!comment && key && string.charAt(i) == '}') {
                codeString += string.substring(lastAddedIndex, i) + '</span>}<span class="blue-text">'
                key = false
                value = false
                lastAddedIndex = ++i
            } else if (!comment && value && string.charAt(i) == ';') {
                codeString += string.substring(lastAddedIndex, i) + '</span>;<span class="aqua-text">'
                key = true
                value = false
                lastAddedIndex = ++i
            } else if (!comment && i + 1 < string.length && string.substring(i, i + 2) == '/*') {
                codeString += string.substring(lastAddedIndex, i) + '<span class="grey-text">/*'
                comment = true
                i += 2
                lastAddedIndex = i
            } else if (comment && i + 1 < string.length && string.substring(i, i + 2) == '*/') {
                codeString += string.substring(lastAddedIndex, i) + '*/</span>'
                comment = false
                i += 2
                lastAddedIndex = i
            }
        }
        codeString += string.substring(lastAddedIndex, string.length - 1)
        return '<span class="blue-text">' + codeString + '</span>'
    }

}

customElements.define('swd-navigation', SwdNavigation)
customElements.define('swd-input', SwdInput)
customElements.define('swd-dropdown', SwdDropdown)
customElements.define('swd-selection', SwdSelection)
customElements.define('swd-dialog', SwdDialog)
customElements.define('swd-code', SwdCode)