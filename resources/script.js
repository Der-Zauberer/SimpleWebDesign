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

class Swd {

    #openDialog;

    setAttribute(id, attribute, value) {
        const target = document.querySelector(`#${id}`)
        if (target) target.setAttribute(attribute, value)
    }

    hide(element) {
        element.setAttribute('hidden', 'true');
    }

    show(element) {
        element.removeAttribute('hidden');
    }

    toggle(element) {
        if (element.hasAttribute('hidden')) {
            element.removeAttribute('hidden');
        } else {
            element.setAttribute('hidden', 'true');
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

customElements.define('swd-router', SwdRouter)
swd = new Swd()

document.addEventListener('click', (event) => swd.trigger(event.target));