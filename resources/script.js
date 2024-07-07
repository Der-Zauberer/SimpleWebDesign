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

    clearPopups() {
        SwdDropdown.closeAllDropdowns()
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
document.addEventListener('click', (event) => {
    if (!event.target.matches('swd-dropdown *')) swd.clearPopups()
    swd.trigger(event.target)
})
document.addEventListener('resize', (event) => swd.clearPopups())
document.addEventListener('input', (event) => event.target.setAttribute('dirty', 'true'))

class SwdComponent extends HTMLElement {

    #events = []
    #observer;

    constructor() {
        super()
        this.#observer = new MutationObserver((mutationList, observer) => {
            this.swdOnUpdate([...mutationList])
        })
        this.#observer.observe(this, { attributes: true, childList: true, subtree: false })
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

    static #openDropdowns = []

    #dropdownInput;
    #dropdownContent;
    #selection;

    #FOCUS_EVENT = event => this.open()
    #BLUR_EVENT = event => this.close()

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            if (!this.#dropdownContent) return
            if (!this.#dropdownInput) {
                if (!this.isOpen()) this.open()
                else this.close()
            }
            if (this.#selection) this.#selection.select(event.target)
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            if (this.#selection && this.#dropdownInput && !this.isOpen() && event.key === 'Enter') {
                event.preventDefault()
                this.open()
                return
            }
            if (!this.#selection || !this.isOpen()) return
            switch (event.key) {
                case 'ArrowUp': case 'ArrowLeft':
                    this.#selection.previous()
                    event.preventDefault()
                    break
                case 'ArrowDown': case 'ArrowRight':
                    this.#selection.next()
                    event.preventDefault()
                    break
                case 'Enter':
                    event.preventDefault()
                    this.close()
                    break
                case 'Escape':
                    this.close()
                    break
            }
        })
    }

    swdOnUpdate(event) {
        if (this.#dropdownInput) {
            this.#dropdownInput.removeEventListener('focus', this.#FOCUS_EVENT)
            this.#dropdownInput.removeEventListener('blur', this.#BLUR_EVENT)
        }
        this.#dropdownContent = this.querySelector('swd-dropdown-content');
        this.#dropdownInput = this.querySelector('swd-dropdown input:not(swd-dropdown-content *)')
        if (this.#dropdownInput) {
            this.#dropdownInput.addEventListener('focus', this.#FOCUS_EVENT)
            this.#dropdownInput.addEventListener('blur', this.#BLUR_EVENT)
        }
        if (this.#dropdownContent) this.#selection = this.#dropdownContent.querySelector('swd-selection')
        if (this.#selection) {
            this.#selection.setOnSelect((value) => { if (this.#dropdownInput) this.#dropdownInput.value = value })
        }
    }

    open() {
        if (!this.#dropdownContent) return
        SwdDropdown.closeAllDropdowns()
        this.#dropdownContent.setAttribute('shown', 'true') 
        this.#setDropdownDirectionAndSize()
        SwdDropdown.#openDropdowns.push(this)
    }

    close() {
        if (!this.#dropdownContent) return
        this.#dropdownContent.removeAttribute('shown')
        SwdDropdown.#openDropdowns = SwdDropdown.#openDropdowns.filter(entry => entry !== this);
    }

    isOpen() { 
        if (!this.#dropdownContent) return false
        return this.#dropdownContent.hasAttribute('shown')
    }

    toggle() {
        if (this.isOpen()) this.close()
        else this.open()
    }

    #setDropdownDirectionAndSize() {
        this.#dropdownContent.style.maxHeight = ''
        this.#dropdownContent.classList.remove('swd-dropdown-content-right')
        this.#dropdownContent.classList.remove('swd-dropdown-content-up')
        const dropdownRect = this.getBoundingClientRect()
        const contentRect = this.#dropdownContent.getBoundingClientRect()
        if (contentRect.right > window.innerWidth) this.#dropdownContent.classList.add('swd-dropdown-content-right')
        if (contentRect.bottom > window.innerHeight) {
            if (dropdownRect.top - contentRect.height > window.innerHeight - contentRect.bottom) {
                if (dropdownRect.top - contentRect.height < 0) {
                    this.#dropdownContent.style.maxHeight = `${dropdownRect.top}px`
                }
                this.#dropdownContent.classList.add('up')
            } else {
                this.#dropdownContent.style.maxHeight = `${window.innerHeight - contentRect.top}px`
            }
        }
    }

    static closeAllDropdowns() {
        for (const dropdown of SwdDropdown.#openDropdowns) dropdown.close()
    }

}

class SwdSelection extends SwdComponent {

    #selectionChangeAction
    value

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => {
            this.select(event.target)
        })
    }

    next() { this.#nextOrPrevious(true) }
    previous() { this.#nextOrPrevious(false) }

    #nextOrPrevious(next) {
        const selected = this.querySelector('[selected]')
        const target = selected ? (next ? selected.nextElementSibling : selected.previousElementSibling) : (next ? this.firstElementChild : this.lastElementChild)
        //TODO Nonvisible
        this.select(target)
    }

    select(target) {
        if (!target || target.nodeName !== 'A') return //TODO Nonvisible
        const selected = this.querySelector('[selected]')
        if (selected === target) return
        if (selected) selected.removeAttribute('selected')
        target.setAttribute('selected', 'true')
        this.value = target ? target.getAttribute('value') || target.innerText : undefined
        if (this.#selectionChangeAction) this.#selectionChangeAction(this.value)
    }

    setOnSelect(action) {
        this.#selectionChangeAction = action
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