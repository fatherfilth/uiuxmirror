/**
 * Flow detection unit tests
 * Tests flow detection pipeline against fixture data
 */

import { describe, it, expect } from 'vitest';
import type { PageData } from '../../src/types/crawl-config.js';
import {
  buildStateFlowGraph,
  classifyFlow,
  detectFlows,
  calculateFlowConfidence,
} from '../../src/patterns/index.js';

// Fixture data: Mock PageData and htmlContents
function createMockPageData(
  url: string,
  title: string,
  htmlContent: string
): PageData {
  return {
    url,
    finalUrl: url,
    statusCode: 200,
    title,
    timestamp: new Date().toISOString(),
    framework: 'unknown',
    cssInJsLibrary: 'none',
    htmlContent,
    screenshotPath: undefined,
  };
}

// Auth flow pages
const loginPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
  <h1>Sign In to Your Account</h1>
  <form action="https://example.com/dashboard" method="POST">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" />
    <label for="password">Password</label>
    <input type="password" id="password" name="password" />
    <button type="submit">Sign In</button>
  </form>
  <a href="/signup">Create Account</a>
  <a href="/">Home</a>
  <a href="/about">About</a>
</body>
</html>
`;

const dashboardPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Welcome to Your Dashboard</h1>
  <p>You are logged in</p>
  <a href="/profile">View Profile</a>
  <a href="/settings">Settings</a>
</body>
</html>
`;

// Checkout flow pages
const cartPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Shopping Cart</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Your Cart</h1>
  <div class="cart-items">
    <div class="item">Product 1</div>
  </div>
  <a href="https://example.com/checkout/shipping">Proceed to Checkout</a>
</body>
</html>
`;

const shippingPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Shipping Information</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Shipping Address</h1>
  <form action="https://example.com/checkout/payment" method="POST">
    <label for="address">Address</label>
    <input type="text" id="address" name="address" />
    <button type="submit">Continue to Payment</button>
  </form>
</body>
</html>
`;

const paymentPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Payment Details</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Payment Information</h1>
  <form action="https://example.com/order/confirmation" method="POST">
    <label for="card">Card Number</label>
    <input type="text" id="card" name="card" />
    <button type="submit">Complete Order</button>
  </form>
</body>
</html>
`;

const confirmationPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Order Confirmation</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Thank You for Your Order!</h1>
  <p>Order #12345 confirmed</p>
  <a href="/">Continue Shopping</a>
</body>
</html>
`;

// Search flow pages
const searchPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Search</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Search Our Products</h1>
  <form action="https://example.com/search/results" method="GET">
    <label for="query">Search</label>
    <input type="search" id="query" name="q" />
    <button type="submit">Search</button>
  </form>
</body>
</html>
`;

const searchResultsPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Search Results</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Search Results for "example"</h1>
  <div class="results">
    <div class="result">Result 1</div>
    <div class="result">Result 2</div>
  </div>
  <a href="https://example.com/search">New Search</a>
</body>
</html>
`;

// Regular navigation pages (no forms)
const homePageHtml = `
<!DOCTYPE html>
<html>
<head><title>Home</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Welcome to Our Site</h1>
  <p>This is the homepage</p>
  <a href="/about">Learn More</a>
</body>
</html>
`;

const aboutPageHtml = `
<!DOCTYPE html>
<html>
<head><title>About Us</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>About Our Company</h1>
  <p>We are a great company</p>
  <a href="/contact">Get in Touch</a>
</body>
</html>
`;

const contactPageHtml = `
<!DOCTYPE html>
<html>
<head><title>Contact</title></head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Contact Us</h1>
  <p>Email us at contact@example.com</p>
  <a href="/">Back to Home</a>
</body>
</html>
`;

// Create mock page data
const mockPages: PageData[] = [
  // Auth flow
  createMockPageData('https://example.com/login', 'Login', loginPageHtml),
  createMockPageData('https://example.com/dashboard', 'Dashboard', dashboardPageHtml),

  // Checkout flow
  createMockPageData('https://example.com/cart', 'Shopping Cart', cartPageHtml),
  createMockPageData('https://example.com/checkout/shipping', 'Shipping Information', shippingPageHtml),
  createMockPageData('https://example.com/checkout/payment', 'Payment Details', paymentPageHtml),
  createMockPageData('https://example.com/order/confirmation', 'Order Confirmation', confirmationPageHtml),

  // Search flow
  createMockPageData('https://example.com/search', 'Search', searchPageHtml),
  createMockPageData('https://example.com/search/results', 'Search Results', searchResultsPageHtml),

  // Regular navigation
  createMockPageData('https://example.com/', 'Home', homePageHtml),
  createMockPageData('https://example.com/about', 'About Us', aboutPageHtml),
  createMockPageData('https://example.com/contact', 'Contact', contactPageHtml),
];

// HTML contents map
const mockHtmlContents = new Map<string, string>(
  mockPages.map(page => [page.url, page.htmlContent])
);

describe('buildStateFlowGraph', () => {
  it('creates nodes for each page', () => {
    const graph = buildStateFlowGraph(mockPages, mockHtmlContents);
    expect(graph.order).toBe(mockPages.length); // order = node count in graphology
  });

  it('creates edges for internal links', () => {
    const graph = buildStateFlowGraph(mockPages, mockHtmlContents);
    // Should have edges (at least some navigation edges)
    expect(graph.size).toBeGreaterThan(0); // size = edge count in graphology
  });

  it('filters navigation edges', () => {
    const graph = buildStateFlowGraph(mockPages, mockHtmlContents);

    // Navigation links like Home, About, Contact appear on most pages (>80%)
    // They should be marked with isNavigation attribute
    const edges = graph.edges();
    const navigationEdges = edges.filter(edge => {
      const attrs = graph.getEdgeAttributes(edge);
      return attrs.isNavigation === true;
    });

    // Should have at least some navigation edges identified
    expect(navigationEdges.length).toBeGreaterThan(0);
  });

  it('handles empty page list', () => {
    const graph = buildStateFlowGraph([], new Map());
    expect(graph.order).toBe(0);
    expect(graph.size).toBe(0);
  });
});

describe('classifyFlow', () => {
  it('classifies auth flow with login keywords and password field', () => {
    const authPages = [
      createMockPageData('https://example.com/login', 'Login', loginPageHtml),
      createMockPageData('https://example.com/dashboard', 'Dashboard', dashboardPageHtml),
    ];
    const htmlMap = new Map(authPages.map(p => [p.url, p.htmlContent]));
    const graph = buildStateFlowGraph(authPages, htmlMap);
    // Get actual node IDs from graph
    const nodeIds = graph.nodes();

    const flowType = classifyFlow(graph, nodeIds);
    expect(flowType).toBe('auth');
  });

  it('classifies checkout flow with cart/payment keywords', () => {
    const checkoutPages = [
      createMockPageData('https://example.com/cart', 'Shopping Cart', cartPageHtml),
      createMockPageData('https://example.com/checkout/shipping', 'Shipping Information', shippingPageHtml),
      createMockPageData('https://example.com/checkout/payment', 'Payment Details', paymentPageHtml),
      createMockPageData('https://example.com/order/confirmation', 'Order Confirmation', confirmationPageHtml),
    ];
    const htmlMap = new Map(checkoutPages.map(p => [p.url, p.htmlContent]));
    const graph = buildStateFlowGraph(checkoutPages, htmlMap);
    const nodeIds = graph.nodes();

    const flowType = classifyFlow(graph, nodeIds);
    expect(flowType).toBe('checkout');
  });

  it('classifies search flow with search input', () => {
    const searchPages = [
      createMockPageData('https://example.com/search', 'Search', searchPageHtml),
      createMockPageData('https://example.com/search/results', 'Search Results', searchResultsPageHtml),
    ];
    const htmlMap = new Map(searchPages.map(p => [p.url, p.htmlContent]));
    const graph = buildStateFlowGraph(searchPages, htmlMap);
    const nodeIds = graph.nodes();

    const flowType = classifyFlow(graph, nodeIds);
    expect(flowType).toBe('search-filter');
  });

  it('returns unknown for generic navigation', () => {
    const navPages = [
      createMockPageData('https://example.com/', 'Home', homePageHtml),
      createMockPageData('https://example.com/about', 'About Us', aboutPageHtml),
      createMockPageData('https://example.com/contact', 'Contact', contactPageHtml),
    ];
    const htmlMap = new Map(navPages.map(p => [p.url, p.htmlContent]));
    const graph = buildStateFlowGraph(navPages, htmlMap);
    const nodeIds = graph.nodes();

    const flowType = classifyFlow(graph, nodeIds);
    expect(flowType).toBe('unknown');
  });
});

describe('detectFlows', () => {
  it('detects auth flow from login pages', () => {
    const flows = detectFlows(mockPages, mockHtmlContents);
    const authFlows = flows.filter(f => f.type === 'auth');

    expect(authFlows.length).toBeGreaterThan(0);
    // Path contains pageIds (hashes), check evidence instead
    expect(authFlows[0].evidence.length).toBeGreaterThan(0);
  });

  it('detects checkout flow from cart/payment sequence', () => {
    const flows = detectFlows(mockPages, mockHtmlContents);
    const checkoutFlows = flows.filter(f => f.type === 'checkout');

    expect(checkoutFlows.length).toBeGreaterThan(0);
    expect(checkoutFlows[0].evidence.length).toBeGreaterThan(0);
  });

  it('does not classify pure navigation as flow', () => {
    // Create a page set with only navigation pages
    const navPages = [
      createMockPageData('https://example.com/', 'Home', homePageHtml),
      createMockPageData('https://example.com/about', 'About Us', aboutPageHtml),
      createMockPageData('https://example.com/contact', 'Contact', contactPageHtml),
    ];
    const navHtml = new Map(navPages.map(p => [p.url, p.htmlContent]));

    const flows = detectFlows(navPages, navHtml);

    // No forms, no flows (or very low confidence flows that get filtered)
    const highConfidenceFlows = flows.filter(f => f.confidence > 0.3);
    expect(highConfidenceFlows.length).toBe(0);
  });

  it('includes evidence in detected flows', () => {
    const flows = detectFlows(mockPages, mockHtmlContents);

    // At least one flow should be detected
    expect(flows.length).toBeGreaterThan(0);

    // Each flow should have evidence
    flows.forEach(flow => {
      expect(flow.evidence.length).toBeGreaterThan(0);
    });
  });

  it('assigns confidence scores', () => {
    const flows = detectFlows(mockPages, mockHtmlContents);

    flows.forEach(flow => {
      expect(flow.confidence).toBeGreaterThan(0);
      expect(flow.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('deduplicates overlapping flows', () => {
    const flows = detectFlows(mockPages, mockHtmlContents);

    // Check for duplicate flows (same type + very similar paths)
    const flowSignatures = flows.map(f => ({
      type: f.type,
      pathSet: new Set(f.path),
    }));

    // No two flows should have >70% overlap (this is enforced by deduplication)
    for (let i = 0; i < flowSignatures.length; i++) {
      for (let j = i + 1; j < flowSignatures.length; j++) {
        if (flowSignatures[i].type === flowSignatures[j].type) {
          const path1 = flowSignatures[i].pathSet;
          const path2 = flowSignatures[j].pathSet;
          const intersection = new Set([...path1].filter(x => path2.has(x)));
          const union = new Set([...path1, ...path2]);
          const overlap = intersection.size / union.size;

          // Overlap should be less than 70% if both flows are kept
          expect(overlap).toBeLessThan(0.7);
        }
      }
    }
  });

  it('returns empty array for no pages', () => {
    const flows = detectFlows([], new Map());
    expect(flows).toEqual([]);
  });
});

describe('calculateFlowConfidence', () => {
  it('gives higher confidence to auth/checkout than unknown', () => {
    // Auth pages with linked flow
    const authLoginHtml = `<html><body><h1>Login</h1><form action="https://example.com/authdash" method="POST"><input type="password" name="pwd" /></form></body></html>`;
    const authDashHtml = `<html><body><h1>Dashboard</h1><p>Welcome</p></body></html>`;
    const authPages = [
      createMockPageData('https://example.com/authlogin', 'Login', authLoginHtml),
      createMockPageData('https://example.com/authdash', 'Dashboard', authDashHtml),
    ];

    // Unknown pages with linked navigation
    const unknownHomeHtml = `<html><body><h1>Home</h1><a href="https://example.com/unknownabout">About</a></body></html>`;
    const unknownAboutHtml = `<html><body><h1>About</h1><a href="https://example.com/unknownhome">Home</a></body></html>`;
    const unknownPages = [
      createMockPageData('https://example.com/unknownhome', 'Home', unknownHomeHtml),
      createMockPageData('https://example.com/unknownabout', 'About Us', unknownAboutHtml),
    ];

    const authHtmlMap = new Map(authPages.map(p => [p.url, p.htmlContent]));
    const authGraph = buildStateFlowGraph(authPages, authHtmlMap);
    const authPath = authGraph.nodes();

    const unknownHtmlMap = new Map(unknownPages.map(p => [p.url, p.htmlContent]));
    const unknownGraph = buildStateFlowGraph(unknownPages, unknownHtmlMap);
    const unknownPath = unknownGraph.nodes();

    const authConfidence = calculateFlowConfidence('auth', authPath, authGraph);
    const unknownConfidence = calculateFlowConfidence('unknown', unknownPath, unknownGraph);

    expect(authConfidence).toBeGreaterThan(unknownConfidence);
  });

  it('reduces confidence for very long paths', () => {
    // Create a very long path (10+ steps) with links
    const longPages = Array.from({ length: 12 }, (_, i) => {
      const nextUrl = i < 11 ? `https://example.com/longstep-${i + 1}` : '';
      const html = `<html><body><form><input type="text" name="field" /></form>${nextUrl ? `<a href="${nextUrl}">Next</a>` : ''}</body></html>`;
      return createMockPageData(`https://example.com/longstep-${i}`, `Step ${i}`, html);
    });
    const shortPages = Array.from({ length: 3 }, (_, i) => {
      const nextUrl = i < 2 ? `https://example.com/shortstep-${i + 1}` : '';
      const html = `<html><body><form><input type="text" name="field" /></form>${nextUrl ? `<a href="${nextUrl}">Next</a>` : ''}</body></html>`;
      return createMockPageData(`https://example.com/shortstep-${i}`, `Short ${i}`, html);
    });

    const longHtmlMap = new Map(longPages.map(p => [p.url, p.htmlContent]));
    const longGraph = buildStateFlowGraph(longPages, longHtmlMap);
    const longPath = longGraph.nodes();

    const shortHtmlMap = new Map(shortPages.map(p => [p.url, p.htmlContent]));
    const shortGraph = buildStateFlowGraph(shortPages, shortHtmlMap);
    const shortPath = shortGraph.nodes();

    const longConfidence = calculateFlowConfidence('multi-step-form', longPath, longGraph);
    const shortConfidence = calculateFlowConfidence('multi-step-form', shortPath, shortGraph);

    // Long paths should have lower confidence
    expect(longConfidence).toBeLessThan(shortConfidence);
  });
});
