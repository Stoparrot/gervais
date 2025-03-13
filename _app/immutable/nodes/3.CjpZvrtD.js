import{t as h,b as c}from"../chunks/D9u51XOd.js";import{i as d}from"../chunks/DSKYDh3O.js";import{w as p,al as g,z as u,X as f,V as o,W as s}from"../chunks/BSv_i5Hy.js";import{M as b}from"../chunks/DgKoE4Zr.js";import{s as v}from"../chunks/B-f_YzIn.js";function x(){return{title:"Markdown Syntax Highlighting Test"}}const M=Object.freeze(Object.defineProperty({__proto__:null,load:x},Symbol.toStringTag,{value:"Module"})),y=`
# Markdown Sample

This is a sample markdown file with code blocks for testing syntax highlighting.

## JavaScript Example

\`\`\`javascript
// This is a JavaScript code block
function helloWorld() {
  console.log("Hello, world!");
  return 42;
}

// Arrow function
const add = (a, b) => a + b;

// Class example
class Person {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    return \`Hello, my name is \${this.name}\`;
  }
}
\`\`\`

## Python Example

\`\`\`python
# This is a Python code block
def hello_world():
    print("Hello, world!")
    return 42

# Class example
class Person:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return f"Hello, my name is {self.name}"
\`\`\`

## TypeScript Example

\`\`\`typescript
// This is a TypeScript code block
function helloWorld(): number {
  console.log("Hello, world!");
  return 42;
}

// Interface
interface Person {
  name: string;
  age: number;
}

// Class with interface
class Employee implements Person {
  name: string;
  age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  greet(): string {
    return \`Hello, my name is \${this.name} and I am \${this.age} years old\`;
  }
}
\`\`\`

## HTML Example

\`\`\`html
<!-- This is an HTML code block -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <h1>Hello, world!</h1>
  <p>This is a paragraph.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</body>
</html>
\`\`\`

## CSS Example

\`\`\`css
/* This is a CSS code block */
body {
  font-family: 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f0f0f0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #333;
  font-size: 2rem;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
}
\`\`\`

## Bash Example

\`\`\`bash
# This is a Bash code block
echo "Hello, world!"

# Variables
name="John"
echo "Hello, $name"

# Conditional
if [ "$name" = "John" ]; then
  echo "Name is John"
else
  echo "Name is not John"
fi

# Loop
for i in {1..5}; do
  echo "Number: $i"
done
\`\`\`
`;var w=h('<div class="container svelte-16xger2"><h1 class="svelte-16xger2">Markdown Syntax Highlighting Test</h1> <div class="theme-toggle svelte-16xger2"><button class="theme-btn svelte-16xger2" data-theme="light">Light Theme</button> <button class="theme-btn svelte-16xger2" data-theme="dark">Dark Theme</button> <button class="theme-btn svelte-16xger2" data-theme="system">System Theme</button></div> <div class="markdown-container svelte-16xger2"><!></div></div>');function P(i,l){p(l,!1),g(()=>{document.querySelectorAll(".theme-btn").forEach(n=>{n.addEventListener("click",()=>{const e=n.getAttribute("data-theme");if(e&&(e==="light"||e==="dark"||e==="system")){const m=e;v.updateSettings({theme:m})}})})}),d();var t=w(),a=f(o(t),4),r=o(a);b(r,{content:y}),s(a),s(t),c(i,t),u()}export{P as component,M as universal};
