// === State ===
let currentLang = 'en';
let currentDigest = null;
let archiveIndex = [];

// === Configuration ===
const SUBSCRIBE_WEBHOOK_URL = 'https://hook.eu2.make.com/ehpwhgzeoua60afk7yzj0dx9s5w9ni6d';

// === DOM Elements ===
const tabs = document.querySelectorAll('.tab');
const contentArea = document.getElementById('content-area');
const archiveList = document.getElementById('archive-list');
const currentDateEl = document.getElementById('current-date');
const subscribeForm = document.getElementById('subscribe-form');
const subscribeEmail = document.getElementById('subscribe-email');
const subscribeBtn = document.getElementById('subscribe-btn');
const subscribeMessage = document.getElementById('subscribe-message');

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSubscribeForm();
    loadArchiveIndex();
});

// === Tab Handling ===
function initTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.dataset.lang;
            setActiveTab(lang);
            renderContent();
        });
    });
}

function setActiveTab(lang) {
    currentLang = lang;
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.lang === lang);
    });
}

// === Subscribe Form ===
function initSubscribeForm() {
    if (!subscribeForm) return;
    
    subscribeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = subscribeEmail.value.trim();
        if (!email) return;
        
        // Show loading state
        subscribeBtn.disabled = true;
        subscribeBtn.querySelector('.btn-text').style.display = 'none';
        subscribeBtn.querySelector('.btn-loading').style.display = 'inline';
        subscribeMessage.textContent = '';
        subscribeMessage.className = 'subscribe-message';
        
        try {
            const response = await fetch(SUBSCRIBE_WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors', // Required for Google Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    timestamp: new Date().toISOString(),
                    source: 'ai-bites-website'
                })
            });
            
            // Since we're using no-cors, we can't read the response
            // We assume success if no error was thrown
            subscribeMessage.textContent = '🎉 Thanks for subscribing!';
            subscribeMessage.className = 'subscribe-message success';
            subscribeEmail.value = '';
            
        } catch (error) {
            console.error('Subscribe error:', error);
            subscribeMessage.textContent = 'Something went wrong. Please try again.';
            subscribeMessage.className = 'subscribe-message error';
        } finally {
            // Reset button state
            subscribeBtn.disabled = false;
            subscribeBtn.querySelector('.btn-text').style.display = 'inline';
            subscribeBtn.querySelector('.btn-loading').style.display = 'none';
        }
    });
}

// === Data Loading ===
async function loadArchiveIndex() {
    try {
        const response = await fetch('/api/digests');
        if (!response.ok) throw new Error('Failed to load archive');
        
        archiveIndex = await response.json();
        renderArchive();
        
        // Load the latest digest
        if (archiveIndex.length > 0) {
            loadDigest(archiveIndex[0].id);
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading archive:', error);
        showDemoContent();
    }
}

async function loadDigest(digestId) {
    showLoading();
    
    try {
        const response = await fetch(`/api/digests/${digestId}`);
        if (!response.ok) throw new Error('Failed to load digest');
        
        currentDigest = await response.json();
        currentDateEl.textContent = formatDate(currentDigest.date);
        renderContent();
        updateArchiveActive(digestId);
    } catch (error) {
        console.error('Error loading digest:', error);
        showError();
    }
}

// === Rendering ===
function renderContent() {
    if (!currentDigest) return;
    
    const content = currentDigest.content[currentLang];
    if (!content) {
        showError('Translation not available');
        return;
    }
    
    let html = '<div class="fade-in">';
    
    // Section 1: Industry News
    if (content.industryNews && content.industryNews.length > 0) {
        html += renderSection('📰', 'Industry News', content.industryNews, 'industry');
    }
    
    // Section 2: What This Means For Us
    if (content.whatThisMeans && content.whatThisMeans.length > 0) {
        html += renderSection('💡', 'What This Means For Us', content.whatThisMeans, 'insight');
    }
    
    // Section 3: Try This
    if (content.tryThis && content.tryThis.length > 0) {
        html += renderSection('🚀', 'Try This', content.tryThis, 'tryThis');
    }
    
    html += '</div>';
    contentArea.innerHTML = html;
}

function renderSection(icon, title, items, type) {
    let html = `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">${icon}</span>
                <h2 class="section-title">${title}</h2>
            </div>
    `;
    
    items.forEach(item => {
        html += renderArticle(item, type);
    });
    
    html += '</div>';
    return html;
}

function renderArticle(item, type) {
    const cardClass = type === 'tryThis' ? 'article try-this-card' : 'article';
    
    let html = `<div class="${cardClass}">`;
    html += `<h3 class="article-headline">${escapeHtml(item.headline)}</h3>`;
    
    if (type === 'industry') {
        // Industry news format
        if (item.whyItMatters) {
            html += `<span class="article-label label-why">Why it matters</span>`;
            html += `<p class="article-text">${escapeHtml(item.whyItMatters)}</p>`;
        }
        if (item.gist) {
            html += `<span class="article-label label-gist">The gist</span>`;
            html += `<p class="article-text">${escapeHtml(item.gist)}</p>`;
        }
    } else if (type === 'insight') {
        // What this means format
        if (item.theNews) {
            html += `<span class="article-label label-news">The news</span>`;
            html += `<p class="article-text">${escapeHtml(item.theNews)}</p>`;
        }
        if (item.ourTake) {
            html += `<span class="article-label label-take">Our take</span>`;
            html += `<p class="article-text">${escapeHtml(item.ourTake)}</p>`;
        }
    } else if (type === 'tryThis') {
        // Try this format
        if (item.whatItIs) {
            html += `<p class="article-text">${escapeHtml(item.whatItIs)}</p>`;
        }
        if (item.howToTry) {
            html += `
                <div class="how-to-try">
                    <div class="how-to-try-label">How to try it</div>
                    <p class="how-to-try-text">${escapeHtml(item.howToTry)}</p>
                </div>
            `;
        }
    }
    
    // Meta info
    if (item.source || item.link) {
        html += '<div class="article-meta">';
        if (item.source) {
            html += `<span class="article-source">Source: ${escapeHtml(item.source)}</span>`;
        }
        if (item.link) {
            html += `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="article-link">Read more →</a>`;
        }
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

function renderArchive() {
    if (archiveIndex.length === 0) {
        archiveList.innerHTML = '<li class="archive-loading">No digests yet</li>';
        return;
    }
    
    let html = '';
    archiveIndex.forEach(digest => {
        html += `
            <li>
                <a href="#" data-id="${digest.id}" onclick="loadDigest('${digest.id}'); return false;">
                    ${formatDate(digest.date)}
                </a>
            </li>
        `;
    });
    archiveList.innerHTML = html;
}

function updateArchiveActive(digestId) {
    document.querySelectorAll('.archive-list a').forEach(link => {
        link.classList.toggle('active', link.dataset.id === digestId);
    });
}

// === UI States ===
function showLoading() {
    contentArea.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p>Fetching the latest bites...</p>
        </div>
    `;
}

function showEmptyState() {
    contentArea.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🍿</div>
            <p class="empty-state-text">No digests yet. The first one is cooking!</p>
        </div>
    `;
    currentDateEl.textContent = 'Coming soon';
}

function showError(message = 'Something went wrong') {
    contentArea.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">😅</div>
            <p class="empty-state-text">${escapeHtml(message)}</p>
        </div>
    `;
}

// === Demo Content (fallback when API not available) ===
function showDemoContent() {
    currentDigest = {
        id: 'demo',
        date: new Date().toISOString(),
        content: {
            en: {
                industryNews: [
                    {
                        headline: "Reuters launches AI-powered personalization engine",
                        whyItMatters: "Direct competitor implementing AI for subscriber retention - shows industry moving fast on personalization.",
                        gist: "Reuters announced a new AI system that analyzes reading patterns to personalize content recommendations and newsletter timing. Early tests show 23% improvement in engagement metrics.",
                        source: "The Rundown AI",
                        link: "#"
                    }
                ],
                whatThisMeans: [
                    {
                        headline: "Spotify's AI DJ feature drives 15% increase in listening time",
                        theNews: "Spotify reported that users who engage with their AI DJ feature listen 15% longer per session. The DJ creates personalized music sequences with AI-generated voice commentary.",
                        ourTake: "The 'AI curator with personality' approach could translate to news. Imagine a daily briefing that's not just personalized content, but has an AI host that explains why each story matters to that specific reader. The voice/personality layer makes algorithmic curation feel human.",
                        source: "Ben's Bites",
                        link: "#"
                    },
                    {
                        headline: "New study: Push notification timing affects open rates by up to 40%",
                        theNews: "Research from Stanford shows that ML-optimized push notification timing can improve open rates by 40% compared to fixed schedules.",
                        ourTake: "We currently send newsletters at fixed times. An AI layer that learns when each subscriber is most likely to engage could significantly impact our open rates and reduce unsubscribes from 'notification fatigue'.",
                        source: "TLDR AI",
                        link: "#"
                    }
                ],
                tryThis: [
                    {
                        headline: "Use Claude to summarize long documents in your preferred format",
                        whatItIs: "Instead of asking AI to 'summarize this', give it a specific format. For example: 'Summarize this as 3 bullet points I can share in Slack' or 'Summarize this as a 2-sentence update for my manager'.",
                        howToTry: "Next time you need to summarize a report or article, try: 'Summarize this as [specific format] for [specific audience]'. The specificity dramatically improves the output.",
                        source: "The Neuron",
                        link: "#"
                    }
                ]
            },
            sv: {
                industryNews: [
                    {
                        headline: "Reuters lanserar AI-driven personaliseringsmotor",
                        whyItMatters: "Direkt konkurrent implementerar AI för att behålla prenumeranter - visar att branschen rör sig snabbt på personalisering.",
                        gist: "Reuters tillkännagav ett nytt AI-system som analyserar läsmönster för att personalisera innehållsrekommendationer och timing för nyhetsbrev. Tidiga tester visar 23% förbättring i engagemangsmått.",
                        source: "The Rundown AI",
                        link: "#"
                    }
                ],
                whatThisMeans: [
                    {
                        headline: "Spotifys AI DJ-funktion ökar lyssningstiden med 15%",
                        theNews: "Spotify rapporterade att användare som interagerar med deras AI DJ-funktion lyssnar 15% längre per session. DJ:n skapar personliga musiksekvenser med AI-genererade röstkommentarer.",
                        ourTake: "Metoden 'AI-kurator med personlighet' kan översättas till nyheter. Tänk dig en daglig briefing som inte bara är personaliserat innehåll, utan har en AI-värd som förklarar varför varje historia är viktig för just den läsaren. Röst-/personlighetslagret får algoritmisk kuratering att kännas mänsklig.",
                        source: "Ben's Bites",
                        link: "#"
                    },
                    {
                        headline: "Ny studie: Timing för push-notiser påverkar öppningsfrekvens med upp till 40%",
                        theNews: "Forskning från Stanford visar att ML-optimerad timing för push-notiser kan förbättra öppningsfrekvensen med 40% jämfört med fasta scheman.",
                        ourTake: "Vi skickar för närvarande nyhetsbrev på fasta tider. Ett AI-lager som lär sig när varje prenumerant är mest benägen att engagera sig kan påverka våra öppningsfrekvenser avsevärt och minska avprenumerationer från 'notis-trötthet'.",
                        source: "TLDR AI",
                        link: "#"
                    }
                ],
                tryThis: [
                    {
                        headline: "Använd Claude för att sammanfatta långa dokument i ditt föredragna format",
                        whatItIs: "Istället för att be AI att 'sammanfatta detta', ge det ett specifikt format. Till exempel: 'Sammanfatta detta som 3 punkter jag kan dela i Slack' eller 'Sammanfatta detta som en 2-menings uppdatering för min chef'.",
                        howToTry: "Nästa gång du behöver sammanfatta en rapport eller artikel, prova: 'Sammanfatta detta som [specifikt format] för [specifik publik]'. Specificiteten förbättrar resultatet dramatiskt.",
                        source: "The Neuron",
                        link: "#"
                    }
                ]
            },
            no: {
                industryNews: [
                    {
                        headline: "Reuters lanserer AI-drevet personaliseringsmotor",
                        whyItMatters: "Direkte konkurrent implementerer AI for å beholde abonnenter - viser at bransjen beveger seg raskt på personalisering.",
                        gist: "Reuters kunngjorde et nytt AI-system som analyserer lesemønstre for å personalisere innholdsanbefalinger og timing for nyhetsbrev. Tidlige tester viser 23% forbedring i engasjementsmålinger.",
                        source: "The Rundown AI",
                        link: "#"
                    }
                ],
                whatThisMeans: [
                    {
                        headline: "Spotifys AI DJ-funksjon øker lyttetiden med 15%",
                        theNews: "Spotify rapporterte at brukere som engasjerer seg med deres AI DJ-funksjon lytter 15% lenger per økt. DJ-en skaper personlige musikksekvenser med AI-genererte stemmekommentarer.",
                        ourTake: "Tilnærmingen 'AI-kurator med personlighet' kan oversettes til nyheter. Se for deg en daglig briefing som ikke bare er personalisert innhold, men har en AI-vert som forklarer hvorfor hver historie er viktig for akkurat den leseren. Stemme-/personlighetslaget får algoritmisk kuratering til å føles menneskelig.",
                        source: "Ben's Bites",
                        link: "#"
                    },
                    {
                        headline: "Ny studie: Timing for push-varsler påvirker åpningsrate med opptil 40%",
                        theNews: "Forskning fra Stanford viser at ML-optimalisert timing for push-varsler kan forbedre åpningsraten med 40% sammenlignet med faste tidsplaner.",
                        ourTake: "Vi sender for tiden nyhetsbrev på faste tidspunkter. Et AI-lag som lærer når hver abonnent er mest sannsynlig å engasjere seg kan påvirke våre åpningsrater betydelig og redusere avmeldinger fra 'varseltretthet'.",
                        source: "TLDR AI",
                        link: "#"
                    }
                ],
                tryThis: [
                    {
                        headline: "Bruk Claude til å oppsummere lange dokumenter i ditt foretrukne format",
                        whatItIs: "I stedet for å be AI om å 'oppsummere dette', gi det et spesifikt format. For eksempel: 'Oppsummer dette som 3 punkter jeg kan dele i Slack' eller 'Oppsummer dette som en 2-setnings oppdatering for min sjef'.",
                        howToTry: "Neste gang du trenger å oppsummere en rapport eller artikkel, prøv: 'Oppsummer dette som [spesifikt format] for [spesifikk målgruppe]'. Spesifisiteten forbedrer resultatet dramatisk.",
                        source: "The Neuron",
                        link: "#"
                    }
                ]
            }
        }
    };
    
    currentDateEl.textContent = 'Demo';
    archiveList.innerHTML = '<li><a href="#" class="active">Demo Edition</a></li>';
    renderContent();
}

// === Utilities ===
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
