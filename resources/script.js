document.addEventListener('readystatechange', event => { 
    if (event.target.readyState === 'interactive') {onLoad();}
    if (event.target.readyState === 'complete') {}
});

//This function will be called, if the body does load the first time
function onLoad() {
    document.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);
    const navigation = document.getElementById('navigation')
    const menu = document.getElementById('smart-menu');
    if (navigation && navigation.classList.contains('navigation-headlines')) generateNavigation();
    if (menu) initializeSmartMenu();
    initializeDropDowns();
    initializeCode();
}

//Remove all elements of menu from the viewport except for the title and images
function initializeSmartMenu() {
    const menu = document.getElementById('smart-menu');
    const navigation = document.getElementById('navigation');
    if (menu) {
        Array.from(menu.children).forEach(element => {
            if (!element.classList.contains('menu-title') && !(element.tagName === 'IMG')) {
                element.classList.add('not-mobile');
            }
        });
    }
    if (!navigation) menu.outerHTML += '<div id=\'navigation\' class=\'navigation only-mobile\'></div>';
}

//Generate a link to a h2 headline at the bottom of the navigation
function generateNavigation() {
    const navigation = document.getElementById('navigation');
    if (navigation) {
        Array.from(document.getElementsByTagName('h2')).forEach(element => {
            if (typeof element.id != 'undefined' && !(element.id === '')) {
                navigation.innerHTML += '<a href=\'#' + element.id + '\'>' + element.innerHTML + '</a>';
            }
        });
    }
}

//Toggle the navigation for the menu on mobile devices
function toggleSmartMenu() {
    const navigation = document.getElementById('navigation');
    let navigationContent = document.getElementsByClassName('navigation-content').item(0);
    if (document.getElementsByClassName('container-fluid').item(0)) navigationContent=document.getElementsByClassName('container-fluid').item(0);
    else if (!navigationContent && document.getElementsByClassName('container').item(0)) navigationContent=document.getElementsByClassName('container').item(0);
    if (navigation) {
        if (navigation.classList.contains('navigation-display')) {
            navigation.classList.remove('navigation-display');
            if (navigationContent) navigationContent.classList.remove('navigation-content-hide');
            Array.from(navigation.children).forEach(element => {
                if (element.classList.contains('menu-item')) navigation.removeChild(element); 
            });
        } else {
            const menu = document.getElementById('smart-menu');
            generateNavigationMenu(menu, navigation);
            navigation.classList.add('navigation-display');
            if (navigationContent) navigationContent.classList.add('navigation-content-hide');
        }
        
    }
}

//Focus the element in the menu, which has the innerHtml of string
function setMenuFocus(string) {
    let menu = document.getElementsByClassName('menu').item(0);
    setRecursiveMenuFocus(string, menu);
}

//Focus the element in the navigation, which has the innerHtml of string
function setNavigationFocus(string) {
    let navigation = document.getElementsByClassName('navigation').item(0);
    setRecursiveNavigationFocus(string, navigation);
}

// Generate navigation entries based on headlines in the document
function generateNavigationMenu(menu, navigation) {
    if (menu && navigation) {
        let menuString = '';
        let hasHome = false;
        Array.from(menu.children).forEach(element => {
            if (!hasHome && navigation && element.tagName === 'A' && element.innerHTML === 'Home') hasHome = true;
        });
        Array.from(menu.children).forEach(element => {
            if (navigation && element.tagName === 'A') {
                let innerHtml = element.innerHTML;
                if (element.classList.contains('menu-title')) innerHtml = 'Home';
                let classString = 'only-mobile menu-item ';
                if (element.classList.contains('menu-active')) classString += 'navigation-active';
                if (!element.classList.contains('menu-title') || !hasHome) menuString += '<a href=\'' + element.href + '\' class=\'' + classString + '\'>' + innerHtml + '</a>';
            } else if (navigation && Array.from(element.children).length > 0) {
                generateNavigationMenu(element, navigation);
            }
        });
        navigation.innerHTML = menuString + navigation.innerHTML;
    }
}

// Set events for all dropdowns
function initializeDropDowns() {
    Array.from(document.getElementsByClassName('dropdown')).forEach(dropdown => {
        const content = dropdown.getElementsByClassName('dropdown-content')[0];
        if (!content) return;
        const input = dropdown.getElementsByTagName('input')[0];
        if (dropdown.classList.contains('dropdown-hover')) dropdown.addEventListener('mouseover', event => translateDropDown(dropdown, content));
        else dropdown.addEventListener('click', event => toggleDropdown(dropdown, content));
        if (input) {
            const valueElements = content.getElementsByTagName('a');
            input.setAttribute("autocomplete", "off");
            let activeElement = -1;
            let visibleElemnts = [];
            input.addEventListener('click', event => {
                visibleElemnts = valueElements;
                activeElement = -1;
                for (var i = 0; i < valueElements.length; i++) valueElements[i].classList.remove('hide');
            });
            for (var i = 0; i < valueElements.length; i++) {
                if (!valueElements[i].hasAttribute('value')) valueElements[i].setAttribute('value', valueElements[i].innerHTML);
                valueElements[i].addEventListener('click', event => {
                    input.value = event.target.getAttribute('value');
                    event.target.classList.remove('dropdown-active');
                    activeElement = -1;
                });
            }
            input.addEventListener('input', event => {
                if (!content.classList.contains('show')) content.classList.add('show');
                if (activeElement != -1 && visibleElemnts.length > 0) visibleElemnts[activeElement].classList.remove('dropdown-active');
                visibleElemnts = [];
                activeElement = -1;
                if (input.value == '') {
                    visibleElemnts = valueElements;
                    for (var i = 0; i < valueElements.length; i++) valueElements[i].classList.remove('hide');
                } else {
                    for (var i = 0; i < valueElements.length; i++) {
                        if (input.value.includes(valueElements[i].getAttribute('value')) || valueElements[i].getAttribute('value').includes(input.value)) {
                            valueElements[i].classList.remove('hide');
                            visibleElemnts.push(valueElements[i]);
                        } else {
                            if (!valueElements[i].classList.contains('hide')) valueElements[i].classList.add('hide');
                        }
                    }
                }
                if (visibleElemnts.length == 0) {
                    if (!content.classList.contains('hide')) content.classList.add('hide');
                } else {
                    content.classList.remove('hide'); 
                }
            });
            input.addEventListener('keydown', event => {
                if (!content.classList.contains('show')) {
                    if (event.keyCode == 13) content.classList.add('show');
                    return;
                }
                if ((event.keyCode == 40 || event.keyCode == 38) && visibleElemnts.length > 0) {
                    event.preventDefault();
                    if (activeElement == -1) {
                        activeElement = event.keyCode == 40 ? 0 : visibleElemnts.length - 1;
                        visibleElemnts[activeElement].classList.add('dropdown-active');
                    } else {
                        visibleElemnts[activeElement].classList.remove('dropdown-active');
                        if (event.keyCode == 40) {
                            if (activeElement + 1 < visibleElemnts.length) activeElement++;
                             else activeElement = 0;
                        } else {
                            if (activeElement - 1 >= 0) activeElement--;
                            else activeElement = visibleElemnts.length - 1;
                        }
                        if (!visibleElemnts[activeElement].classList.contains('dropdown-active')) visibleElemnts[activeElement].classList.add('dropdown-active');
                    }
                    const contentRect = content.getBoundingClientRect();
                    const elementRect = visibleElemnts[activeElement].getBoundingClientRect();
                    const elementOffset = visibleElemnts[activeElement].offsetTop;
                    if (elementOffset + elementRect.height > content.scrollTop + contentRect.height) content.scrollTop = elementOffset + elementRect.height - contentRect.height;
                    else if (elementOffset < content.scrollTop) content.scrollTop = elementOffset;
                } else if (event.keyCode == 13 && activeElement != -1) {
                    valueElements[activeElement].click();
                }
            });
        }
    });
}

//Toggle visibility of dropdown content
function toggleDropdown(dropdown, content) {
    if (content.classList.contains('show')) {
        content.classList.remove('show');
    } else {
        hideAllDropdowns();
        content.classList.add('show');
        translateDropDown(dropdown, content);
    }
}

//Hide all dropdowns
function hideAllDropdowns() {
    Array.from(document.getElementsByClassName('dropdown')).forEach(element => {
        const content = element.getElementsByClassName('dropdown-content')[0];
        if (content) content.classList.remove('show');
    });
}

//Toggle visibillity of dialog
function toggleDialog(dialog) {
    if (dialog) {
        if (dialog.classList.contains('show')) {
            dialog.classList.remove('show');
        } else {
            hideAllDropdowns();
            dialog.classList.add('show');
        }
    }
}

//private
function setRecursiveMenuFocus(string, menu) {
    if (menu && Array.from(menu.children).length > 0) {
        Array.from(menu.children).forEach(element => {
            if (Array.from(element.children).length > 0) {
                setRecursiveMenuFocus(string, element);
            } else if (element.innerHTML.toLowerCase() === string.toLowerCase()) {
                element.classList.add('menu-active');
                return;
            }
        });
    }
}

//private
function setRecursiveNavigationFocus(string, navigation) {
    if (navigation && Array.from(navigation.children).length > 0) {
        Array.from(navigation.children).forEach(element => {
            if (Array.from(element.children).length > 0) {
                setRecursiveMenuFocus(string, element);
            } else if (element.innerHTML.toLowerCase() === string.toLowerCase()) {
                element.classList.add('navigation-active');
                return;
            }
        });
    }
}

// private
function onMouseClick(event) {
    const navigation = document.getElementById('navigation');
    if (navigation) {
        if (navigation.classList.contains('navigation-display') && event.clientX > 250) {
            toggleSmartMenu();
        }
    }
    if (event.target && event.target.parentNode && !event.target.parentNode.classList.contains('dropdown')) {
        hideAllDropdowns();
    }
}

//private
function onWindowResize() {
    const navigation = document.getElementById('navigation');
    if (navigation) {
        if (navigation.classList.contains('navigation-display')) {
            toggleSmartMenu();
        }
    }
    initializeDropDowns();
}

//private
function translateDropDown(dropdown, content) {
    const contentRect = content.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    if (contentRect.right > window.innerWidth) content.style.cssText = 'left: -' + (contentRect.width - dropdownRect.width) + 'px;';
    if (dropdown.getElementsByTagName('input')[0]) {
        if (contentRect.bottom > window.innerHeight && window.innerHeight - contentRect.top > 100) content.style.maxHeight = (window.innerHeight - contentRect.top) + 'px';
        else content.style.maxHeight = '';
    }
    
}

function initializeCode() {
    Array.from(document.getElementsByTagName('code')).forEach(element => {
        if (element.classList.contains("html")) element.innerHTML = highlightHtml(element.innerHTML);
        else if (element.classList.contains("css")) element.innerHTML = highlightCss(element.innerHTML);
    });
}

function highlightHtml(string) {
    let codeString = '';
    let tag = false;
    let attribute = false;
    let value = false;
    let comment = false;
    let lastAddedIndex = 0;
    for (let i = 0; i < string.length; i++) {
        if (!tag && i + 3 < string.length && string.substring(i, i + 4) == '&lt;' && !(i + 7 < string.length && string.substring(i, i + 7) == '&lt;!--')) {
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
        } else if (tag && !attribute && string.charAt(i) == ' ') {
            codeString += string.substring(lastAddedIndex, i) + '<span class="green-text">';
            attribute = true;
            lastAddedIndex = i;
        } else if (tag && attribute && string.charAt(i) == '"') {
            codeString += value ? string.substring(lastAddedIndex, i) + '"</span>' : string.substring(lastAddedIndex, i) + '<span class="red-text">"';
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
    codeString += string.substring(lastAddedIndex, string.length - 1);
    return codeString;
}

function highlightCss(string) {
    let codeString = '';
    let key = false;
    let value = false;
    let comment = false;
    let lastAddedIndex = 0;
    for (let i = 0; i < string.length; i++) {
        if (!comment && !key && string.charAt(i) == '{') {
            codeString += string.substring(lastAddedIndex, i) + '</span>{<span class="green-text">';
            key = true;
            lastAddedIndex = ++i;
        } else if (!comment && key && string.charAt(i) == ':') {
            codeString += string.substring(lastAddedIndex, i) + '</span>:<span class="red-text">';
            value = true;
            lastAddedIndex = ++i;
        } else if (!comment && key && string.charAt(i) == '}') {
            codeString += string.substring(lastAddedIndex, i) + '</span>}<span class="blue-text">';
            key = false;
            value = false;
            lastAddedIndex = ++i;
        } else if (!comment && value && string.charAt(i) == ';') {
            codeString += string.substring(lastAddedIndex, i) + '</span>;<span class="green-text">';
            key = true;
            value = false;
            lastAddedIndex = ++i;
        } else if (!comment && i + 1 < string.length && string.substring(i, i + 2) == '/*') {
            codeString += string.substring(lastAddedIndex, i) + '<span class="grey-text">/*';
            comment = true;
            i += 2;
            lastAddedIndex = i;
        } else if (comment && i + 1 < string.length && string.substring(i, i + 2) == '*/') {
            codeString += string.substring(lastAddedIndex, i) + '/*</span>';
            comment = false;
            i += 2;
            lastAddedIndex = i;
        }
    }
    codeString += string.substring(lastAddedIndex, string.length - 1);
    return '<span class="blue-text">' + codeString + '</span>';
}