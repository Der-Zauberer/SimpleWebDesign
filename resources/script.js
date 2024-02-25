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

    setAttribute(id, attribute, value) {
        const target = document.querySelector(`#${id}`)
        if (target) target.setAttribute(attribute, value)
    }

}

customElements.define('swd-router', SwdRouter)
swd = new Swd()