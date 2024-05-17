class Swd {

    #loaded = false;
    #afterRenderedActions = [];
    #openDialog;

    constructor() {
        document.addEventListener('readystatechange', event => { 
            if (event.target.readyState === 'interactive') {
                console.log('interactive')
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

    hide(element) {
        element.setAttribute('hidden', 'true')
    }

    show(element) {
        element.removeAttribute('hidden')
    }

    toggle(element) {
        if (element.hasAttribute('hidden')) {
            element.removeAttribute('hidden')
        } else {
            element.setAttribute('hidden', 'true')
        }
    }

    openDialog(element) {
        this.closeDialog()
        element.setAttribute('shown', 'shown')
        this.#openDialog = element;
    }

    closeDialog() {
        if (this.#openDialog) this.#openDialog.removeAttribute('shown')
    }

    trigger(target) {
        if (!target) return
        [...target.attributes].filter(attribute => attribute.name.startsWith('swd-')).forEach(attribute => {
            switch (attribute.name) {
                case 'swd-hide': 
                    this.#forEachElementById(attribute.value, element => this.hide(element))
                    break
                case 'swd-show': 
                    this.#forEachElementById(attribute.value, element => this.show(element))
                    break
                case 'swd-toggle': 
                    this.#forEachElementById(attribute.value, element => this.toggle(element))
                    break
                case 'swd-dialog-open': 
                    this.#forEachElementById(attribute.value, element => this.openDialog(element))
                    break
                case 'swd-dialog-close': 
                    this.closeDialog()
                    break
                default: 
                    break
            }
        })
    }

    #forEachElementById(string, action) {
        return [...string.split(' ')]
            .map(id => document.querySelector(`#${id}`))
            .forEach(element => action(element))
    }

}

swd = new Swd()
document.addEventListener('click', (event) => swd.trigger(event.target))

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

class SwdDropdown extends SwdComponent {

    #contentElement;
    #selection;

    swdAfterRendered() {
        const toggleElement = this.querySelector('[swd-dropdown-toggle]');
        if (!toggleElement) return;
        this.#contentElement = this.querySelector('swd-dropdown-content');
        if (!this.#contentElement) return;
        this.#selection = this.querySelector('swd-selection')
        this.swdRegisterManagedEvent(toggleElement, 'click', event => {
            this.toggleDropdown()
        })
        this.swdRegisterManagedEvent(toggleElement, 'keydown', event => {
            if (this.#selection) this.#selection.dispatchEvent(event)
        })
    }

    openDropdown() {
        this.#contentElement.setAttribute('shown', 'true')
    }

    closeDropdown() {
        this.#contentElement.removeAttribute('shown')
    }

    toggleDropdown() {
        if (this.#contentElement.hasAttribute('shown')) this.#contentElement.removeAttribute('shown')
        else this.#contentElement.setAttribute('shown', 'true')
    }

}

class SwdSelection extends SwdComponent {

    #selected
    value

    swdAfterRendered() {
        this.#selected = this.querySelector('[selected]')
        this.swdRegisterManagedEvent(this, 'click', event => {
            this.#select(event.target)
        })
        this.swdRegisterManagedEvent(this, 'keydown', event => {
            console.log(event)
        })
    }

    #select(target) {
        if (this.#select === target) return
        if (this.#selected) this.#selected.removeAttribute('selected')
        this.#selected = target;
        this.#selected.setAttribute('selected', 'true')
        this.value = this.#selected.getAttribute('value') || this.#selected.innerText
    }

}

customElements.define('swd-dropdown', SwdDropdown)
customElements.define('swd-selection', SwdSelection)