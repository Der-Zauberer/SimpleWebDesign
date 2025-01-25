# SimpleWebDesign

A simple way to style your responsive website! This is a framework like Bootstrap but more lightweight. [https://der-zauberer.github.io/SimpleWebDesign/](https://der-zauberer.github.io/SimpleWebDesign/)

## Features

### Web-Components

Components with logical functionality are implementend using the web-components standard. It is faster than old implementation approaches and are compatible with single-page-applicaton frameworks like vue and angular.

### Dynamic Color System

Theme colors can be easily set with variables. The framework supports automatic light-mode and dark-mode detection but can also be used with one mode only.

### I18n Localization

Attributes and inner-html text can be localized. The translations can be stored in properties files.

### Lightweigt Databinding

There is a simple way to read and write data to attributes and inner-html to create small tools very fast. Is is not recommended to use this as a replacement to single-page-applicaton frameworks because the feature set is very minimal.

### Usage in SPA-Frameworks (Vue, Angular)

The SimpleWebDesign framework can be used in single-page-applicaton frameworks like vue and angular. But there are some configurations to make it work. You have to enable web-components in your framework and import the script and stylesheet. These steps can vary in different frameworks. I you want to access to swd variable you can do it by using `window.swd` if you are in a module context.

## Setup

Download you stylesheet [here](http://127.0.0.1:5500/SimpleWebDesign/downloads) or use the hostet version of the css and javascript files:

```html
<link href="https://der-zauberer.github.io/SimpleWebDesign/downloads/v2.2/swd.min.css" rel="stylesheet">
<script src="https://der-zauberer.github.io/SimpleWebDesign/downloads/v2.2/swd.min.js"></script>
```

You can create a `.html` file using the following template. If you use the downloaded version of the resources you have to change the `script.src` and `link.href` paths to your local path.

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="theme-color" content="#003ecc">
        <link href="https://der-zauberer.github.io/SimpleWebDesign/downloads/v2.2/swd.min.css" rel="stylesheet">
        <script src="https://der-zauberer.github.io/SimpleWebDesign/downloads/v2.2/swd.min.js"></script>
        <title>Template</title>
    </head>
    <body>

        <!-- Your content here -->

    </body>
</html>
```