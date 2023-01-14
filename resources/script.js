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
        const input = dropdown.getElementsByTagName('input')[0];
        if (dropdown.classList.contains('dropdown-hover'))  dropdown.addEventListener('mouseover', event => translateDropDown(dropdown, content));
        else dropdown.addEventListener('click', event => toggleDropdown(dropdown, content));
        if (input) {
            const valueElements = content.getElementsByTagName('a');
            input.setAttribute("autocomplete", "off");
            for (var i = 0; i < valueElements.length; i++) {
                if (!valueElements[i].hasAttribute('value')) valueElements[i].setAttribute('value', valueElements[i].innerHTML);
                const value = valueElements[i].getAttribute('value');
                valueElements[i].addEventListener('click', event => {
                    input.value = value;
                    toggleDropdown(dropdown, content);
                });
            }
            input.addEventListener('input', event => {
                let counter = 0;
                for (var i = 0; i < valueElements.length; i++) {
                    if (input.value == '') {
                        if (valueElements[i].classList.contains('hide')) valueElements[i].classList.remove('hide');
                        counter++;
                    } else if (input.value.includes(valueElements[i].getAttribute('value')) || valueElements[i].getAttribute('value').includes(input.value)) {
                        if (valueElements[i].classList.contains('hide')) valueElements[i].classList.remove('hide');
                        counter++;
                    } else {
                        if (!valueElements[i].classList.contains('hide')) valueElements[i].classList.add('hide');
                    }
                }
                if (counter == 0) {
                    if (!content.classList.contains('hide')) content.classList.add('hide');
                } else {
                    content.classList.remove('hide'); 
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
        if (content != null && content.classList.contains('show')) {
            content.classList.remove('show');
        }
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
    const windowSize = window.innerWidth;
    if (contentRect.right > windowSize) content.style.cssText = 'left: -' + (contentRect.width - dropdownRect.width) + 'px;';
}