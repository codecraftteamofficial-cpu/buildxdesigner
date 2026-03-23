import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import {
  Search,
  Type,
  Square,
  Image,
  Navigation,
  MousePointer,
  FileText,
  Users,
  Mail,
  Menu,
  Grid3X3,
  Star,
  Layout,
  Code,
  Layers,
  LayoutGrid,
  LogIn,
  UserPlus,
  Minus,
  BoxSelect,
  ChevronDown,
  PanelTopClose,
  Columns,
  AlertTriangle,
  Maximize2,
  CreditCard,
  FormInput,
} from "lucide-react";
import { ComponentData } from "../App";
import { useDrag, DragSourceMonitor } from "react-dnd";
import { useEffect, useRef } from "react";
import { TourGuide } from "./Guides/Highlight";

interface BlocksPaletteProps {
  onSelectBlock: (block: ComponentData) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

interface DraggableBlockProps {
  block: any;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function DraggableBlock({
  block,
  onClick,
  children,
  className,
}: DraggableBlockProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "component",
    item: {
      type: block.component.type,
      props: block.component.props,
      style: block.component.style,
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onClick={onClick}
      className={`${className} ${isDragging ? "opacity-50" : ""} cursor-move`}
    >
      {children}
    </div>
  );
}

export function BlocksPalette({
  onSelectBlock,
  searchTerm,
  onSearchChange,
}: BlocksPaletteProps) {
  const blockCategories = [
    {
      name: "Basic Elements",
      icon: <Type className="w-4 h-4" />,
      id: "elements",
      blocks: [
        {
          id: "text",
          name: "Text",
          description: "Simple text paragraph",
          icon: <Type className="w-4 h-4" />,
          component: {
            id: "",
            type: "text",
            props: { content: "Sample text content" },
            style: {},
          },
        },
        {
          id: "heading",
          name: "Heading",
          description: "Page or section heading",
          icon: <Type className="w-4 h-4" />,
          component: {
            id: "",
            type: "heading",
            props: { content: "Sample Heading", level: 1 },
            style: {},
          },
        },
        {
          id: "button",
          name: "Button",
          description: "Interactive button element",
          icon: <MousePointer className="w-4 h-4" />,
          component: {
            id: "",
            type: "button",
            props: {
              text: "Click Me",
              variant: "default",
              onClick: 'console.log("Button clicked!")',
            },
            style: {},
          },
        },
      ],
    },
    {
      name: "Shapes",
      icon: <Square className="w-4 h-4" />,
      id: "shapes",
      blocks: [
        {
          id: "shapes",
          name: "Shapes",
          description: "A flexible shape block (pick the shape in Properties)",
          icon: <Square className="w-4 h-4" />,
          component: {
            id: "",
            type: "shape",
            props: {
              shape: "rectangle",
              fill: "#3b82f6",
              stroke: "#1f2937",
              strokeWidth: 2,
              cornerRadius: 0,
            },
            style: {
              width: "200px",
              height: "120px",
            },
          },
        },
      ],
    },
    {
      name: "Layout",
      icon: <Layout className="w-4 h-4" />,
      blocks: [
        {
          id: "divider",
          name: "Divider",
          description: "Horizontal line to separate content",
          icon: <Minus className="w-4 h-4" />,
          component: {
            id: "",
            type: "divider",
            props: {
              styleType: "solid",
              thickness: "1px",
              color: "#000000ff",
            },
            style: {
              width: "100%",
              margin: "16px 0",
            },
          },
        },
        {
          id: "container",
          name: "Container",
          description: "A container for other elements",
          icon: <Square className="w-4 h-4" />,
          component: {
            id: "",
            type: "container",
            props: {
              children: [],
              className: "p-4 border border-gray-200 rounded-lg bg-white",
              elementId: "container-" + Math.random().toString(36).substr(2, 9), // Generate a random ID
            },
            style: {},
          },
        },
      ],
    },
    {
      name: "Interactive",
      icon: <ChevronDown className="w-4 h-4" />,
      blocks: [
        {
          id: "accordion",
          name: "Accordion (FAQ)",
          description: "Collapsible content sections for FAQs",
          icon: <PanelTopClose className="w-4 h-4" />,
          component: {
            id: "",
            type: "accordion",
            props: {
              items: [
                {
                  question: "What is this?",
                  answer:
                    "This is a sample accordion item. Click to expand or collapse.",
                },
                {
                  question: "How does it work?",
                  answer:
                    "Each item can be toggled open or closed independently.",
                },
              ],
              allowMultiple: false,
            },
            style: {
              width: "100%",
            },
          },
        },
        {
          id: "tabs",
          name: "Tabs",
          description: "Switchable content panels",
          icon: <Columns className="w-4 h-4" />,
          component: {
            id: "",
            type: "tabs",
            props: {
              tabs: [
                { label: "Tab 1", content: "Content for Tab 1" },
                { label: "Tab 2", content: "Content for Tab 2" },
                { label: "Tab 3", content: "Content for Tab 3" },
              ],
              activeTab: 0,
            },
            style: {
              width: "100%",
            },
          },
        },
        {
          id: "modal",
          name: "Modal / Popup",
          description: "Button that opens a customizable overlay",
          icon: <Maximize2 className="w-4 h-4" />,
          component: {
            id: "",
            type: "modal",
            props: {
              triggerText: "Open Modal",
              modalTitle: "Modal Title",
              modalContent:
                "This is the modal body content. You can customize this text.",
              overlayColor: "rgba(0,0,0,0.5)",
            },
            style: {
              width: "auto",
            },
          },
        },
        {
          id: "alert",
          name: "Alert / Banner",
          description: "Callout box for important messages",
          icon: <AlertTriangle className="w-4 h-4" />,
          component: {
            id: "",
            type: "alert",
            props: {
              variant: "info",
              message: "This is an informational alert message.",
              dismissible: true,
            },
            style: {
              width: "100%",
            },
          },
        },
      ],
    },
    {
      name: "Navigation",
      icon: <Navigation className="w-4 h-4" />,
      blocks: [
        {
          id: "navbar",
          name: "Navigation Bar",
          description: "Top navigation with logo and links",
          icon: <Navigation className="w-4 h-4" />,
          component: {
            id: "",
            type: "navbar",
            props: {
              brand: "Your Brand",
              links: ["Home", "About", "Services", "Contact"],
            },
            style: {},
            page_id: "",
            page_ids: [],
          },
        },
        {
          id: "hero",
          name: "Hero Section",
          description: "Large banner with title and CTA",
          icon: <Star className="w-4 h-4" />,
          component: {
            id: "",
            type: "hero",
            props: {
              title: "Welcome to Our Site",
              subtitle: "Build amazing websites with ease",
            },
            style: {},
          },
        },
        {
          id: "footer",
          name: "Footer",
          description: "Bottom page footer",
          icon: <Menu className="w-4 h-4" />,
          component: {
            id: "",
            type: "footer",
            props: { copyright: "© 2024 Your Company. All rights reserved." },
            style: {},
            page_id: "",
            page_ids: [],
          },
        },
      ],
    },
    {
      name: "Forms",
      icon: <FileText className="w-4 h-4" />,
      blocks: [
        {
          id: "input",
          name: "Input Field",
          description: "Text input field",
          icon: <FileText className="w-4 h-4" />,
          component: {
            id: "",
            type: "input",
            props: { placeholder: "Enter text...", type: "text" },
            style: {},
          },
        },
        {
          id: "textarea",
          name: "Text Area",
          description: "Multi-line text input",
          icon: <FileText className="w-4 h-4" />,
          component: {
            id: "",
            type: "textarea",
            props: { placeholder: "Enter your message..." },
            style: {},
          },
        },

        {
          id: "form",
          name: "Contact Form",
          description: "Complete contact form",
          icon: <Mail className="w-4 h-4" />,
          component: {
            id: "",
            type: "form",
            props: {
              title: "Get In Touch",
              submitText: "Submit",
              recipientEmail: "",
              fields: [
                {
                  id: "field-1",
                  label: "Name",
                  placeholder: "Enter your name",
                  type: "text",
                  required: true,
                },
                {
                  id: "field-2",
                  label: "Email",
                  placeholder: "Enter your email",
                  type: "email",
                  required: true,
                },
                {
                  id: "field-3",
                  label: "Message",
                  placeholder: "Enter your message",
                  type: "textarea",
                  required: true,
                },
              ],
              html: `<form class="contact-form" id="$elementId" method="POST" action="">
  <h3>{{FORM_TITLE}}</h3>
  <p class="contact-msg" style="display:none;"></p>
  <input type="hidden" name="action" value="contact">
  <div class="form-group"><label>Name</label><input type="text" name="name" required placeholder="Enter your name"></div>
  <div class="form-group"><label>Email</label><input type="email" name="email" required placeholder="Enter your email"></div>
  <div class="form-group"><label>Message</label><textarea name="message" required placeholder="Enter your message"></textarea></div>
  <button type="submit">{{SUBMIT_TEXT}}</button>
</form>`,
              css: `.contact-form { display: flex; flex-direction: column; gap: 1rem; max-width: 400px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-family: system-ui, sans-serif; }
.contact-form h3 { margin-top: 0; color: #111827; }
.contact-msg { padding: 10px; background: #e0f2fe; color: #1e40af; border-radius: 4px; font-size: 0.875rem; margin-bottom: 1rem; }
.contact-form .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.contact-form .form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.contact-form input, .contact-form textarea { padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; outline: none; font-family: inherit; }
.contact-form input:focus, .contact-form textarea:focus { border-color: #3b82f6; }
.contact-form button { padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; }
.contact-form button:hover { background: #2563eb; }`,
              js_handler: `const form = document.getElementById('$elementId');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = form.querySelector('.contact-msg');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    msgEl.textContent = 'Sending...';
    msgEl.style.display = 'block';
    
    const result = await window.buildx.apiCall('/api/resend', {
      to: '{{RECIPIENT_EMAIL}}',
      subject: 'New Contact Form Submission',
      html: '<table>' + Object.entries(data).map(([k, v]) => '<tr><td><b>' + k + '</b></td><td>' + v + '</td></tr>').join('') + '</table>'
    });
    
    if (result.success) {
      msgEl.textContent = 'Thank you ' + (data.name || '') + ', your message has been sent successfully!';
      form.reset();
    } else {
      msgEl.textContent = 'Error: ' + (result.error || 'Failed to send message.');
      msgEl.style.background = '#fee2e2';
      msgEl.style.color = '#991b1b';
    }
  });
}`
            },
            style: {},
          },
        },
        {
          id: "dynamic-form",
          name: "Dynamic Form",
          description: "Form with dynamic fields and Supabase CRUD support",
          icon: <FormInput className="w-4 h-4" />,
          component: {
            id: "",
            type: "dynamic-form",
            props: {
              title: "Dynamic Form",
              submitButtonText: "Submit",
              supabaseTable: "",
              supabaseOperation: "insert",
              fields: [
                {
                  id: "field-1",
                  label: "Full Name",
                  placeholder: "Enter your full name",
                  type: "text",
                  required: true,
                  fieldName: "full_name",
                },
                {
                  id: "field-2",
                  label: "Email Address",
                  placeholder: "Enter your email",
                  type: "email",
                  required: true,
                  fieldName: "email_address",
                },
              ],
              submitButtonActions: [
                {
                  id: "submit-action-1",
                  type: "onClick",
                  handlerType: "supabase",
                  handler: "",
                  supabaseOperation: "insert",
                  supabaseTable: "",
                  supabaseData: {},
                },
              ],
              html: `<form class="dynamic-form" id="$elementId" method="POST" action="">
  <h3>Dynamic Form</h3>
  <p class="form-msg" style="display:none;"></p>
  <input type="hidden" name="action" value="insert">
  <input type="hidden" name="table" value="your_table_name">
  <div class="form-group">
    <label>Full Name</label>
    <input type="text" name="full_name" placeholder="Enter your full name" required />
  </div>
  <div class="form-group">
    <label>Email Address</label>
    <input type="email" name="email_address" placeholder="Enter your email" required />
  </div>
  <button type="submit" class="dynamic-submit">Submit</button>
</form>`,
              css: `.dynamic-form { display: flex; flex-direction: column; gap: 1rem; max-width: 400px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-family: system-ui, sans-serif; }
.dynamic-form h3 { margin-top: 0; color: #111827; }
.form-msg { padding: 10px; background: #e0f2fe; color: #1e40af; border-radius: 4px; font-size: 0.875rem; margin-bottom: 1rem; }
.dynamic-form .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.dynamic-form .form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.dynamic-form input { padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; outline: none; }
.dynamic-form input:focus { border-color: #3b82f6; }
.dynamic-form .dynamic-submit { padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; }
.dynamic-form .dynamic-submit:hover { background: #2563eb; }`,
              js_handler: `const form = document.getElementById('$elementId');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = form.querySelector('.form-msg');
    const table = form.querySelector('input[name="table"]').value;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    delete data.action;
    delete data.table;

    msgEl.textContent = 'Submitting...';
    msgEl.style.display = 'block';

    const result = await window.buildx.data.insert(table, data);
    if (!result.error) {
      msgEl.textContent = 'Success! Your information has been submitted.';
      form.reset();
    } else {
      msgEl.textContent = 'Error: ' + (result.error.message || 'Submission failed.');
      msgEl.style.background = '#fee2e2';
      msgEl.style.color = '#991b1b';
    }
  });
}
`,
              php_backend: `require_once __DIR__ . '/../lib/supabase.php';
$formMsg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'insert') {
    $db = new Supabase();
    $table = $_POST['table'] ?? '';
    if (!empty($table) && $table !== 'your_table_name') {
        $reserved = ['table', 'action', 'filters'];
        $data = array_diff_key($_POST, array_flip($reserved));
        $res = $db->insert($table, $data);
        if (isset($res['status']) && $res['status'] >= 200 && $res['status'] < 300) {
            $formMsg = 'Success! Your information has been submitted.';
        } else {
            $formMsg = 'Error: ' . ($res['error']['message'] ?? 'Submission failed.');
        }
    } else {
        $formMsg = 'Error: Table name is missing or invalid.';
    }
}`
            },
            style: {
              width: "400px",
            },
          },
        },
        {
          id: "select",
          name: "Select / Dropdown",
          description: "Dropdown menu for selecting options",
          icon: <ChevronDown className="w-4 h-4" />,
          component: {
            id: "",
            type: "select",
            props: {
              label: "Select Option",
              placeholder: "Select an option...",
              options: [
                { label: "Option 1", value: "option1" },
                { label: "Option 2", value: "option2" },
                { label: "Option 3", value: "option3" },
              ],
            },
            style: {
              width: "100%",
            },
          },
        },
        {
          id: "checkbox",
          name: "Checkbox",
          description: "Single checkbox with label",
          icon: <BoxSelect className="w-4 h-4" />,
          component: {
            id: "",
            type: "checkbox",
            props: {
              label: "Remember me",
              checked: false,
            },
            style: {},
          },
        },
        {
          id: "radio-group",
          name: "Radio Group",
          description: "List of radio buttons for single selection",
          icon: <Users className="w-4 h-4" />,
          component: {
            id: "",
            type: "radio-group",
            props: {
              label: "Choose an option",
              options: [
                { label: "Option 1", value: "option1" },
                { label: "Option 2", value: "option2" },
              ],
              defaultValue: "option1",
            },
            style: {
              width: "100%",
            },
          },
        },
      ],
    },
    {
      name: "Media",
      icon: <Image className="w-4 h-4" />,
      blocks: [
        {
          id: "image",
          name: "Image",
          description: "Image with responsive sizing",
          icon: <Image className="w-4 h-4" />,
          component: {
            id: "",
            type: "image",
            props: { src: "", alt: "Sample image", width: 300, height: 200 },
            style: {},
          },
        },
        {
          id: "carousel",
          name: "Image Carousel",
          description: "Responsive image carousel with navigation",
          icon: <LayoutGrid className="w-4 h-4" />,
          component: {
            id: "",
            type: "carousel",
            props: {
              slides: [
                { id: "1", src: "", alt: "Slide 1", caption: "First slide" },
                { id: "2", src: "", alt: "Slide 2", caption: "Second slide" },
                { id: "3", src: "", alt: "Slide 3", caption: "Third slide" },
              ],
              autoplay: true,
              autoplaySpeed: 3000,
              showArrows: true,
              showDots: true,
              infinite: true,
            },
            style: {
              width: "100%",
              height: "300px",
              borderRadius: "0.5rem",
              overflow: "hidden",
            },
          },
        },
      ],
    },
    {
      name: "Data",
      icon: <LayoutGrid className="w-4 h-4" />,
      blocks: [
        {
          id: "table",
          name: "Data Table",
          description: "Display data in rows and columns",
          icon: <LayoutGrid className="w-4 h-4" />,
          component: {
            id: "",
            type: "table",
            props: {
              headers: ["Name", "Role", "Status"],
              data: [
                { Name: "John Doe", Role: "Admin", Status: "Active" },
                { Name: "Jane Smith", Role: "User", Status: "Pending" },
              ],
              supabaseTable: "", // To be connected to a table
              tableName: "Users Table", // Display title
              html: `<div class="data-table-container" id="$elementId">
  <h3>{{TABLE_TITLE}}</h3>
  <table class="data-table">
    <thead>
      <tr class="header-row">
        <!-- Headers will be injected here -->
      </tr>
    </thead>
    <tbody class="body-rows">
      <!-- Data will be injected here -->
      <tr><td colspan="100%">Loading data...</td></tr>
    </tbody>
  </table>
</div>`,
              css: `#$elementId .data-table-container { width: 100%; overflow-x: auto; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 1rem 0; font-family: system-ui, -apple-system, sans-serif; }
#$elementId .data-table-container h3 { padding: 1rem; margin: 0; border-bottom: 1px solid #e5e7eb; color: #111827; }
#$elementId .data-table { width: 100%; border-collapse: collapse; text-align: left; }
#$elementId .data-table th, #$elementId .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; }
#$elementId .data-table th { background: #f9fafb; font-weight: 500; color: #374151; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
#$elementId .data-table td { color: #4b5563; font-size: 0.875rem; }
#$elementId .data-table tr:hover { background: #f9fafb; transition: background 0.15s; }`,
              js_handler: `const container = document.getElementById('$elementId');
if (container) {
  const table = '{{SUPABASE_TABLE}}';
  const columns = '{{SUPABASE_SELECT_COLUMNS}}' || '*';
  const headerConfig = [{{TABLE_HEADERS_CONFIG}}]; // Expected format: 'key' => 'label' (PHP style) -> needs manual fix or use object
  
  const loadData = async () => {
    if (!table) return;
    const { data, error } = await window.buildx.data.select(table, columns);
    if (error) {
      console.error('Table load error:', error);
      return;
    }
    
    const tbody = container.querySelector('.body-rows');
    const theadRow = container.querySelector('.header-row');
    
    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      
      // Build Headers
      theadRow.innerHTML = keys.map(k => '<th>' + k + '</th>').join('');
      
      // Build Rows
      tbody.innerHTML = data.map(row => '<tr>' + keys.map(k => '<td>' + (row[k] || '') + '</td>').join('') + '</tr>').join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="100%">No data found.</td></tr>';
    }
  };
  loadData();
}`
            },
            style: {
              width: "100%",
              overflow: "auto",
            },
          },
        },
      ],
    },
    {
      name: "Authentication",
      icon: <Users className="w-4 h-4" />,
      blocks: [
        {
          id: "sign-in",
          name: "Sign In Form",
          description: "Ready-to-use Supabase Sign In form",
          icon: <LogIn className="w-4 h-4" />,
          component: {
            id: "",
            type: "sign-in",
            props: {
              title: "Sign In",
              description:
                "Enter your email and password to access your account.",
              buttonText: "Sign In",
              redirectUrl: "/",
              switchToSignUpText: "Sign Up",
              switchToSignUpUrl: "/sign-up",
              html: `<div class="auth-container" id="$elementId" data-component-type="sign-in">
  <h2>Sign In</h2>
  <p>Enter your email and password to access your account.</p>
  <p class="auth-error" style="display:none;"></p>
  <form class="auth-form" data-action="signin" data-redirect="/">
    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" required placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" name="password" required placeholder="••••••••">
    </div>
    <button type="submit" class="auth-button">Sign In</button>
  </form>
  <div class="auth-links">
    <p>Don't have an account? <a href="sign-up.html">Sign Up</a></p>
  </div>
</div>`,
              css: `.auth-container { max-width: 400px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: system-ui, sans-serif; }
.auth-container h2 { margin-top: 0; margin-bottom: 0.5rem; color: #111827; }
.auth-container > p { color: #4b5563; font-size: 0.875rem; margin-bottom: 1.5rem; }
.auth-error { color: #dc2626; background: #fee2e2; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1rem; }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.375rem; }
.form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.form-group input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
.form-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
.auth-button { background-color: #3b82f6; color: white; padding: 0.625rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: background-color 0.15s; margin-top: 0.5rem; }
.auth-button:hover { background-color: #2563eb; }
.auth-links { margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: #4b5563; }
.auth-links a { color: #3b82f6; text-decoration: none; font-weight: 500; }
.auth-links a:hover { text-decoration: underline; }`,
              js_handler: `const form = document.getElementById('$elementId')?.querySelector('form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = form.parentElement.querySelector('.auth-error');
    const email = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;
    const redirect = form.getAttribute('data-redirect') || '/';
    
    errorEl.style.display = 'none';
    
    const { error } = await window.buildx.auth.signIn(email, password);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    } else {
      window.location.href = redirect;
    }
  });
}`
            },
            style: {
              width: "400px",
              padding: "24px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
          },
        },
        {
          id: "auth-block",
          name: "Unified Auth Block",
          description: "Combined Sign In & Sign Up with easy switching",
          icon: <Users className="w-4 h-4" />,
          component: {
            id: "",
            type: "auth-block",
            props: {
              initialMode: "signin",
              signInTitle: "Sign In",
              signInDescription:
                "Enter your email and password to access your account.",
              signInButtonText: "Sign In",
              signUpTitle: "Sign Up",
              signUpDescription:
                "Create a new account by filling out the form below.",
              signUpButtonText: "Sign Up",
              redirectUrl: "/",
              extraFields: [],
              html: `<div class="auth-container" id="$elementId">
  <h2>Sign In / Sign Up</h2>
  <p>Please authenticate to continue.</p>
  <p class="auth-error" style="display:none;"></p>
  <form class="auth-form" data-action="signin">
    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" required placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" name="password" required placeholder="••••••••">
    </div>
    <button type="submit" class="auth-button">Continue</button>
  </form>
</div>`,
              css: `.auth-container { max-width: 400px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: system-ui, sans-serif; }
.auth-container h2 { margin-top: 0; margin-bottom: 0.5rem; color: #111827; }
.auth-container > p { color: #4b5563; font-size: 0.875rem; margin-bottom: 1.5rem; }
.auth-error { color: #dc2626; background: #fee2e2; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1rem; }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.375rem; }
.form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.form-group input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
.form-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
.auth-button { background-color: #3b82f6; color: white; padding: 0.625rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: background-color 0.15s; margin-top: 0.5rem; }
.auth-button:hover { background-color: #2563eb; }`,
              js_handler: `const container = document.getElementById('$elementId');
if (container) {
  const form = container.querySelector('form');
  const errorEl = container.querySelector('.auth-error');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;
    const action = form.getAttribute('data-action');
    const redirect = '/';
    
    errorEl.style.display = 'none';
    
    let result;
    if (action === 'signup') {
      result = await window.buildx.auth.signUp(email, password);
    } else {
      result = await window.buildx.auth.signIn(email, password);
    }
    
    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.style.display = 'block';
    } else {
      window.location.href = redirect;
    }
  });
}`
            },
            style: {
              width: "400px",
              padding: "24px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
          },
        },
        {
          id: "sign-up",
          name: "Sign Up Form",
          description: "Supabase Sign Up with custom metadata fields",
          icon: <UserPlus className="w-4 h-4" />,
          component: {
            id: "",
            type: "sign-up",
            props: {
              title: "Sign Up",
              description:
                "Create a new account by filling out the form below.",
              buttonText: "Sign Up",
              redirectUrl: "/",
              extraFields: [],
              switchToSignInText: "Sign In",
              switchToSignInUrl: "/sign-in",
              html: `<div class="auth-container" id="$elementId">
  <h2>Sign Up</h2>
  <p>Create a new account by filling out the form below.</p>
  <p class="auth-error" style="display:none;"></p>
  <p class="auth-success" style="display:none;">Sign up successful! Please check your email.</p>
  <form class="auth-form" data-action="signup">
    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" required placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" name="password" required placeholder="••••••••">
    </div>
    <button type="submit" class="auth-button">Sign Up</button>
  </form>
  <div class="auth-links">
    <p>Already have an account? <a href="sign-in.html">Sign In</a></p>
  </div>
</div>`,
              css: `.auth-container { max-width: 400px; margin: 2rem auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: system-ui, sans-serif; }
.auth-container h2 { margin-top: 0; margin-bottom: 0.5rem; color: #111827; }
.auth-container > p { color: #4b5563; font-size: 0.875rem; margin-bottom: 1.5rem; }
.auth-error { color: #dc2626; background: #fee2e2; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1rem; }
.auth-success { color: #16a34a; background: #dcfce7; padding: 0.5rem; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 1rem; }
.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.375rem; }
.form-group label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.form-group input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
.form-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
.auth-button { background-color: #3b82f6; color: white; padding: 0.625rem; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: background-color 0.15s; margin-top: 0.5rem; }
.auth-button:hover { background-color: #2563eb; }
.auth-links { margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: #4b5563; }
.auth-links a { color: #3b82f6; text-decoration: none; font-weight: 500; }
.auth-links a:hover { text-decoration: underline; }`,
              js_handler: `const container = document.getElementById('$elementId');
if (container) {
  const form = container.querySelector('form');
  const errorEl = container.querySelector('.auth-error');
  const successEl = container.querySelector('.auth-success');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;
    const redirect = form.getAttribute('data-redirect') || '/';
    
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    const { error } = await window.buildx.auth.signUp(email, password);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    } else {
      successEl.style.display = 'block';
      form.reset();
      setTimeout(() => {
        window.location.href = redirect;
      }, 2000);
    }
  });
}`
            },
            style: {
              width: "400px",
              padding: "24px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
          },
        },
        {
          id: "profile",
          name: "Profile Dropdown",
          description: "User avatar with customizable dropdown menu",
          icon: <Users className="w-4 h-4" />,
          component: {
            id: "",
            type: "profile",
            props: {
              menuItems: [{ id: "1", label: "Settings", path: "/settings" }],
              html: `<div class="profile-dropdown" id="$elementId">
  <button class="profile-btn"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></button>
  <div class="dropdown-menu">
    <div id="profile-links">
      <a href="sign-in.html">Sign In</a>
    </div>
  </div>
</div>`,
              css: `.profile-dropdown { position: relative; display: inline-block; font-family: system-ui, sans-serif; }
.profile-btn { background: #f3f4f6; border: none; border-radius: 50%; padding: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #4b5563; transition: background 0.2s; }
.profile-btn:hover { background: #e5e7eb; }
.dropdown-menu { display: none; position: absolute; right: 0; margin-top: 0.5rem; width: 12rem; background: white; border-radius: 0.375rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; z-index: 50; overflow: hidden; }
.profile-dropdown:hover .dropdown-menu { display: block; }
.dropdown-menu a, .dropdown-item { display: block; padding: 0.75rem 1rem; text-decoration: none; color: #374151; font-size: 0.875rem; transition: background 0.15s; font-family: inherit; }
.dropdown-menu a:hover, .dropdown-item:hover { background: #f9fafb; }
.dropdown-menu hr { border: 0; border-top: 1px solid #e5e7eb; margin: 0; }`,
              js_handler: `const container = document.getElementById('$elementId');
if (container) {
  const linksContainer = container.querySelector('#profile-links');
  const btn = container.querySelector('.profile-btn');
  const menu = container.querySelector('.dropdown-menu');
  
  // Toggle menu
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });
  
  // Close menu on outside click
  document.addEventListener('click', () => {
    if (menu) menu.style.display = 'none';
  });

  // Check auth state
  const checkAuth = async () => {
    const { data: { user } } = await window.buildx.auth.getUser();
    if (user && linksContainer) {
      linksContainer.innerHTML = \`
        <div class="dropdown-item" style="font-weight:600; border-bottom: 1px solid #eee;">\${user.email}</div>
        <a href="profile.html">My Profile</a>
        <a href="#" id="sign-out-link">Sign Out</a>
      \`;
      
      document.getElementById('sign-out-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.buildx.auth.signOut();
        window.location.reload();
      });
    }
  };
  checkAuth();
}`
            },
            style: {
              width: "50px",
              height: "50px",
            },
          },
        },
      ],
    },
    {
      name: "Payment",
      icon: <CreditCard className="w-4 h-4" />,
      blocks: [
        {
          id: "paymongo-button",
          name: "PayMongo Button",
          description: "Payment button with PayMongo integration",
          icon: <CreditCard className="w-4 h-4" />,
          component: {
            id: "",
            type: "paymongo-button",
            props: {
              label: "Buy Now",
              amount: 100,
              description: "Product Purchase",
              currency: "PHP",
              variant: "default",
              size: "default",
              html: `<button type="button" class="paymongo-btn" id="$elementId" data-action="paymongo" data-amount="100">Buy Now (PHP 100)</button>`,
              css: `.paymongo-btn { background-color: #3b82f6; color: #fff; font-weight: 500; padding: 0.625rem 1.25rem; border-radius: 0.375rem; border: none; cursor: pointer; transition: background-color 0.15s; font-family: system-ui, sans-serif; }
.paymongo-btn:hover { background-color: #2563eb; }`,
            },
            style: {},
          },
        },
      ],
    },
  ];

  // Filter blocks based on search term
  const filteredCategories = blockCategories
    .map((category) => ({
      ...category,
      blocks: category.blocks.filter(
        (block) =>
          block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.description.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
    .filter((category) => category.blocks.length > 0);

  const handleBlockClick = (block: any) => {
    const componentData: ComponentData = {
      ...block.component,
      id: Date.now().toString() + Math.random(),
    };
    onSelectBlock(componentData);
  };

  return (
    <Card className="h-full flex flex-col" id="blocks-palette">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Blocks Palette
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredCategories.reduce(
              (total, cat) => total + cat.blocks.length,
              0,
            )}{" "}
            blocks
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="p-4 space-y-4">
            {filteredCategories.map((category, categoryIndex) => (
              <div key={category.name}>
                {categoryIndex > 0 && <Separator className="mb-4" />}

                <div className="mb-3">
                  <h4 className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                    {category.icon}
                    {category.name}
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {category.blocks.map((block) => (
                    <DraggableBlock
                      key={block.id}
                      block={block}
                      onClick={() => handleBlockClick(block)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                          {block.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm group-hover:text-primary transition-colors">
                            {block.name}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {block.description}
                          </p>
                        </div>
                      </div>
                    </DraggableBlock>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No blocks found matching "{searchTerm}"</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
