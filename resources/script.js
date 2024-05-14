class SwdComponent extends HTMLElement {

    #events = []
    #observer;

    constructor() {
        super()
        this.#observer = new MutationObserver((mutationList, observer) => {
            [...mutationList].forEach(mutation => this.swdOnUpdate(mutation))
        })
        this.#observer.observe(this, { attributes: true, childList: true, subtree: true })
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
    swdOnUpdate(mutation) {}
    swdOnDestroy() {}

    swdRegisterManagedEvent(target, event, action) {
        this.#events.push({ target, event, action })
        target.addEventListener(event, action)
    }

}

class SwdRouter extends HTMLElement {

    static get observedAttributes() {
        return ['src']
    }

    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue) return
        this[property] = newValue
        if (property == 'src') this.route(newValue);
    }

    route(src) {
        if (src === null || src === undefined || src === '') return
        fetch(src).then(response => response.text()).then(text => this.innerHTML = text)
    }

}

class SwdTestComponent extends SwdComponent {

    swdOnInit() {
        this.swdRegisterManagedEvent(this, 'click', event => console.log(event))
        console.log('Loaded')
    }

    swdOnUpdate(mutation) {
        console.log(mutation)
    }

}

class Swd {

    #openDialog;

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
                case 'swd-open-dialog': 
                    this.#forEachElementById(attribute.value, element => this.openDialog(element))
                    break
                case 'swd-close-dialog': 
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

customElements.define('swd-router', SwdRouter)
customElements.define('swd-test', SwdTestComponent)