export const markdownSample = `
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
`; 