// Array containing Indian States and the remaining Union Territories (Keep this)
const indianStatesAndUTs = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Chandigarh (UT)",
    "Delhi (NCT)",
    "Jammu and Kashmir (UT)",
    "Puducherry (UT)"
];

// ====================================================================
// START: SANITY CONFIGURATION
// ====================================================================
const sanityConfig = {
    projectId: "bfm9u3cy", // <-- YOUR PROJECT ID
    dataset: "production", // Or your dataset name
    apiVersion: '2023-05-03', // Use current date or appropriate API version

    // ⚠️ WARNING: This is INSECURE. Anyone can steal this token.
    // But it will make your app work in a single file.
    // Replace this with your *actual* token string.
    token: "skTdqQoo49Y3YGofI7uisb6Jl3myP4nvJ84FptRLd03snqQY6KuVoqFVZdh57LkvaaUTktC5zf4seM5urC39GAJzOq7zfxeLPFeKqEwh9hmv8567wsuVopOwhnR3m1KNjqrse1pLXsLt8M0SVBCVUt9ZHONb8vO7QBJaqyVTjsSBRjIajA9U",

    // This is required when using a token, and it ensures
    // you always see fresh data, which fixes your "refresh" problem.
    useCdn: false
};

// Correctly initialize the client from the UMD script
const client = window.sanityClient.default(sanityConfig);

let isAppReady = false;
let currentOrders = [];

// --- STATUS CONSTANTS (Keep these) ---
const INITIAL_STATUS = 'FormFilled';
const KANBAN_STATUSES = ['Pending', 'ToDo', 'Processing', 'Dispatched'];
const STATUS_COLORS = {
    [INITIAL_STATUS]: 'bg-red-100 text-red-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'ToDo': 'bg-indigo-100 text-indigo-800',
    'Processing': 'bg-blue-100 text-blue-800',
    'Dispatched': 'bg-green-100 text-green-800',
};
const STATUS_LABELS = {
    [INITIAL_STATUS]: 'New Submission',
    'Pending': 'Pending',
    'ToDo': 'TO-DO',
    'Processing': 'Done',
    'Dispatched': 'Shipped/Dispatched',
};

// --- Gemini API Configuration (Still insecure) ---
// ⚠️ DANGER: This is also insecure and should be moved to a backend.
const apiKey = "";

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const formView = document.getElementById('form-view');
const initialReviewView = document.getElementById('initial-review-view');
const dashboardView = document.getElementById('dashboard-view');
const orderForm = document.getElementById('order-form');
const formMessage = document.getElementById('form-message');
const ordersKanban = document.getElementById('orders-kanban');
const initialOrdersList = document.getElementById('initial-orders-list');
const initialEmptyMessage = document.getElementById('initial-empty-message');
const authStatusP = document.getElementById('auth-status');
const showFormBtn = document.getElementById('show-form-btn');
const showInitialReviewBtn = document.getElementById('show-initial-review-btn');
const initialCountSpan = document.getElementById('initial-count');
const showDashboardBtn = document.getElementById('show-dashboard-btn');

// --- Utility Functions (Modals, etc.) ---
function showModal(title, content) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = `<p class="text-gray-600 mb-5">${content}</p>`;
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    confirmBtn.textContent = 'OK';
    confirmBtn.onclick = () => { modal.classList.add('hidden'); };
    cancelBtn.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.opacity = '1'; modal.querySelector('div').classList.remove('scale-95'); modal.querySelector('div').classList.add('scale-100'); }, 10);
}

// ... (Keep your other modal/Gemini functions if you use them) ...

// --- Sanity Initialization Logic ---
async function initializeAppWithSanity() {
    authStatusP.textContent = 'Sanity Connected';
    isAppReady = true;
    loadingScreen.classList.add('hidden');
    populateStateDropdown();
    populateStatusSelect();
    await fetchAndRenderOrders();
    listenForSanityOrders();
    switchView('initial-review');
}

// --- Dropdown Population Function ---
function populateStateDropdown() {
    const dropdown = document.getElementById('state');
    if (dropdown) {
        dropdown.innerHTML = '<option value="" disabled selected>-- Select State/UT --</option>';
        indianStatesAndUTs.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            dropdown.appendChild(option);
        });
    }
}

// --- View Switching ---
function resetButtons() {
    [showFormBtn, showInitialReviewBtn, showDashboardBtn].forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-gray-700', 'hover:bg-gray-100');
    });
}
window.switchView = (viewName) => {
    if (!isAppReady) return;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    resetButtons();
    if (viewName === 'form') {
        formView.classList.remove('hidden');
        showFormBtn.classList.add('bg-indigo-600', 'text-white');
    } else if (viewName === 'initial-review') {
        initialReviewView.classList.remove('hidden');
        showInitialReviewBtn.classList.add('bg-indigo-600', 'text-white');
    } else if (viewName === 'dashboard') {
        dashboardView.classList.remove('hidden');
        showDashboardBtn.classList.add('bg-indigo-600', 'text-white');
    }
};

// --- MODIFIED: Order Form Submission ---
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!client) {
        showModal("Error", "Sanity client not initialized.");
        return;
    }
    // This check will now PASS because you hardcoded the token
    if (!sanityConfig.token) {
        showModal("Configuration Error", "Sanity write token is missing. Cannot submit order.");
        console.error("Sanity token is missing. Submission disabled.");
        return;
    }

    const formData = {
        customerName: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        altPhone: document.getElementById('altPhone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        pincode: document.getElementById('pincode').value,
        state: document.getElementById('state').value,
        orderDetails: document.getElementById('orderDetails').value,
        comments: document.getElementById('comments').value,
        status: INITIAL_STATUS
    };

    const newOrderDocument = {
        _type: 'order',
        ...formData
    };

    try {
        const result = await client.create(newOrderDocument);
        console.log('Order submitted successfully:', result._id);
        formMessage.textContent = 'Order submitted successfully! We will contact you soon.';
        formMessage.classList.remove('hidden', 'text-red-600');
        formMessage.classList.add('text-green-600');
        orderForm.reset();
        populateStateDropdown();
        setTimeout(() => formMessage.classList.add('hidden'), 5000);
    } catch (error) {
        console.error("Error submitting order to Sanity: ", error);
        showModal("Submission Failed", `There was an error submitting the order. Check console and Sanity CORS origins. Details: ${error.message}`);
        formMessage.textContent = 'Submission failed. Please try again.';
        formMessage.classList.remove('hidden', 'text-green-600');
        formMessage.classList.add('text-red-600');
    }
});

// --- Drag and Drop Handlers ---
let draggedOrderId = null;
function handleDragStart(e, orderId) {
     // This check will now PASS
    if (!sanityConfig.token) {
        e.preventDefault();
        showModal("Feature Disabled", "Order status updates require a configured write token.");
        return;
    }
    draggedOrderId = orderId;
    e.dataTransfer.setData('text/plain', orderId);
    setTimeout(() => e.target.classList.add('opacity-50'), 0);
}
function handleDragEnd(e) { e.target.classList.remove('opacity-50'); draggedOrderId = null; }
function handleDragOver(e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target && target.classList.contains('status-column')) {
        target.classList.add('border-4', 'border-dashed', 'border-indigo-400', 'bg-indigo-50');
    }
}
function handleDragLeave(e) {
    const target = e.currentTarget;
    if (target) {
        target.classList.remove('border-4', 'border-dashed', 'border-indigo-400', 'bg-indigo-50');
    }
}
async function handleDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target) {
         target.classList.remove('border-4', 'border-dashed', 'border-indigo-400', 'bg-indigo-50');
    }
    const orderId = e.dataTransfer.getData('text/plain');
    const newStatus = target.getAttribute('data-status');
    if (orderId && newStatus) {
        await updateSanityOrderStatus(orderId, newStatus);
    }
}

// --- CSV Export Functions ---
const CSV_HEADERS = [
    "Order ID", "Status", "Customer Name", "Phone Number",
    "Shipping Address",
    "Alternative Phone number and land mark",
    "City", "State", "Pincode",
    "Order Details / Items", "Comments / Notes", "Date Submitted"
];
function escapeCSV(value) {
    if (value === null || value === undefined) return "";
    let str = String(value);
    str = str.replace(/"/g, '""').replace(/\n/g, ' ');
    if (str.includes(',') || str.includes('"') || str.includes(' ')) {
        return `"${str}"`;
    }
    return str;
}
window.downloadOrdersAsCSV = (statusFilter) => {
    let ordersToExport = currentOrders;
    if (statusFilter === 'All') {
        ordersToExport = ordersToExport.filter(order => order.status !== INITIAL_STATUS);
    } else if (statusFilter) {
        ordersToExport = ordersToExport.filter(order => order.status === statusFilter);
    }
    if (ordersToExport.length === 0) {
        showModal("Download Error", "No orders match the selected status filter to download.");
        return;
    }
    let csvContent = CSV_HEADERS.join(',') + '\n';
    ordersToExport.forEach(order => {
        const row = [
            order.id,
            STATUS_LABELS[order.status],
            escapeCSV(order.customerName),
            escapeCSV(order.phone),
            escapeCSV(order.address),
            escapeCSV(order.altPhone || ''),
            escapeCSV(order.city),
            escapeCSV(order.state),
            escapeCSV(order.pincode),
            escapeCSV(order.orderDetails),
            escapeCSV(order.comments || ''),
            order.createdAt ? new Date(order.createdAt).toLocaleString() : ''
        ];
        csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = statusFilter && statusFilter !== 'All' ?
        `Orders_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv` :
        `All_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
window.downloadOrders = () => {
    const statusSelect = document.getElementById('status-select');
    window.downloadOrdersAsCSV(statusSelect.value);
};
function populateStatusSelect() {
    const statusSelect = document.getElementById('status-select');
    while (statusSelect.options.length > 1) {
        statusSelect.remove(1);
    }
    KANBAN_STATUSES.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = STATUS_LABELS[status];
        statusSelect.appendChild(option);
    });
}

// --- Dashboard Real-time Management ---
function mapSanityDocToOrder(doc) {
    return {
        id: doc._id,
        createdAt: doc._createdAt,
        updatedAt: doc._updatedAt,
        ...doc
    };
}
const sanityOrderQuery = '*[_type == "order"] | order(_createdAt desc)';
let sanityListenerSubscription = null;

async function fetchAndRenderOrders() {
    try {
        // This fetch will now WORK because useCdn:false and token is provided
        const sanityDocs = await client.fetch(sanityOrderQuery);
        currentOrders = sanityDocs.map(mapSanityDocToOrder);
        renderAllBoards(currentOrders);
    } catch (error) {
        console.error("Error fetching initial orders from Sanity:", error);
        showModal("Error", "Could not load initial order data. Check Sanity connection and CORS origins.");
    }
}

function listenForSanityOrders() {
    if (sanityListenerSubscription) {
        sanityListenerSubscription.unsubscribe();
    }
    sanityListenerSubscription = client.listen(sanityOrderQuery, {}, { includeResult: false, visibility: 'query' })
        .subscribe(update => {
            console.log('Sanity update received:', update);
            // This will refetch the LIVE data, so it will update instantly.
            fetchAndRenderOrders();
        });
}

function renderAllBoards(orders) {
    const initialOrders = orders.filter(o => o.status === INITIAL_STATUS);
    const kanbanOrders = orders.filter(o => o.status !== INITIAL_STATUS);
    renderInitialReviewBoard(initialOrders);
    renderKanbanBoard(kanbanOrders);
}

function renderInitialReviewBoard(orders) {
    initialOrdersList.innerHTML = '';
    if (orders.length === 0) {
        initialEmptyMessage.classList.remove('hidden');
        initialCountSpan.classList.add('hidden');
    } else {
        initialEmptyMessage.classList.add('hidden');
        initialCountSpan.classList.remove('hidden');
        initialCountSpan.textContent = orders.length;
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(order => {
            const orderCard = createOrderCard(order);
            orderCard.classList.remove('border-indigo-500');
            orderCard.classList.add('border-red-500');
            initialOrdersList.appendChild(orderCard);
        });
    }
}

function renderKanbanBoard(orders) {
    const groupedOrders = orders.reduce((acc, order) => {
        const status = order.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(order);
        return acc;
    }, {});

    ordersKanban.innerHTML = '';
    KANBAN_STATUSES.forEach(status => {
        const column = document.createElement('div');
        column.className = 'flex flex-col rounded-xl bg-white shadow-xl p-4';

        const header = document.createElement('h3');
        const orderCount = (groupedOrders[status] || []).length;
        header.className = `text-lg font-semibold mb-4 p-2 rounded-lg ${STATUS_COLORS[status]}`;
        header.textContent = `${STATUS_LABELS[status]} (${orderCount})`;
        column.appendChild(header);

        const ordersList = document.createElement('div');
        ordersList.id = `column-${status}`;
        ordersList.className = 'space-y-4 status-column pr-2 min-h-[100px] transition duration-200';

        ordersList.setAttribute('data-status', status);
        ordersList.ondragover = handleDragOver;
        ordersList.ondragenter = (e) => e.preventDefault();
        ordersList.ondragleave = handleDragLeave;
        ordersList.ondrop = handleDrop;

        (groupedOrders[status] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(order => {
            const orderCard = createOrderCard(order);
            ordersList.appendChild(orderCard);
        });

        column.appendChild(ordersList);
        ordersKanban.appendChild(column);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    const canModify = !!sanityConfig.token; // This will be true

    if (canModify) {
        card.setAttribute('draggable', 'true');
        card.ondragstart = (e) => handleDragStart(e, order.id);
        card.ondragend = handleDragEnd;
        card.className = 'bg-gray-50 p-4 rounded-lg shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition duration-200 cursor-grab';
    } else {
        card.className = 'bg-gray-100 p-4 rounded-lg shadow-inner border-t-4 border-gray-400 text-gray-500 cursor-default';
    }

    const idSpan = document.createElement('span');
    idSpan.className = 'text-xs font-mono text-gray-500 block mb-1';
    idSpan.textContent = `ID: ${order.id.substring(0, 8)}...`;
    card.appendChild(idSpan);

    const name = document.createElement('p');
    name.className = 'text-base font-bold text-gray-800';
    name.textContent = order.customerName;
    card.appendChild(name);

    const details = document.createElement('p');
    details.className = 'text-sm text-gray-600 mt-1 whitespace-pre-wrap';
    let addressSummary = order.address;
    let altPhoneAndLandmark = order.altPhone || 'N/A';
    details.textContent = `Items: ${order.orderDetails}\nAddress: ${addressSummary}\nAlt Phone/Landmark: ${altPhoneAndLandmark}`;
    card.appendChild(details);

    if (order.createdAt) {
        const date = new Date(order.createdAt);
        const time = document.createElement('p');
        time.className = 'text-xs text-gray-400 mt-2';
        time.textContent = `Submitted: ${date.toLocaleString()}`;
        card.appendChild(time);
    }

    // --- Status Change Button ---
    const allStatuses = [INITIAL_STATUS, ...KANBAN_STATUSES];
    const currentStatusIndex = allStatuses.indexOf(order.status);
    const nextStatusIndex = currentStatusIndex + 1;
    const nextStatus = allStatuses[nextStatusIndex];

    if (nextStatus) {
        const nextLabel = STATUS_LABELS[nextStatus];
        const button = document.createElement('button');
        button.className = 'mt-2 w-full py-2 text-sm font-semibold rounded-lg text-white bg-indigo-500 hover:bg-indigo-600 transition duration-150 shadow-md';
        button.textContent = `→ Move to ${nextLabel}`;

        if (!canModify) {
            button.disabled = true;
            button.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
            button.classList.add('bg-gray-400', 'cursor-not-allowed');
        } else {
            button.onclick = () => updateSanityOrderStatus(order.id, nextStatus);
        }
        card.appendChild(button);
    } else {
        const doneMessage = document.createElement('p');
        doneMessage.className = 'mt-2 w-full py-2 text-sm text-center font-semibold rounded-lg bg-green-500 text-white';
        doneMessage.textContent = 'Order Complete!';
        card.appendChild(doneMessage);
    }
    return card;
}

// --- Update Order Status using Sanity ---
async function updateSanityOrderStatus(orderId, newStatus) {
    if (!sanityConfig.token) {
        showModal("Access Denied", "Status updates require a configured write token.");
        return;
    }
    if (!client) {
        showModal("Error", "Sanity client not initialized.");
        return;
    }
    try {
        await client
            .patch(orderId)
            .set({ status: newStatus })
            .commit();
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        // The real-time listener will see this change and call
        // fetchAndRenderOrders(), which updates the UI.
    } catch (error) {
        console.error("Error updating Sanity document: ", error);
        showModal("Update Failed", `Could not update status to ${newStatus}. Check Sanity token permissions and console. Details: ${error.message}`);
    }
}

// --- Start the app ---
initializeAppWithSanity();
