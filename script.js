const root = document.documentElement;
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const themeToggle = document.getElementById('theme-toggle');
const fontSmaller = document.getElementById('font-smaller');
const fontReset = document.getElementById('font-reset');
const fontLarger = document.getElementById('font-larger');
const filterButtons = document.querySelectorAll('.filter-btn');
const sessionCards = document.querySelectorAll('.session-card');
const faqItems = document.querySelectorAll('.faq-item');
const contactForm = document.getElementById('contact-form');
const feedback = document.getElementById('form-feedback');

const STORAGE_KEYS = {
  theme: 'ubc-theme',
  fontSize: 'ubc-font-size'
};

function getWeatherPresentation(code) {
  const weatherCode = Number(code);

  if (weatherCode === 0) 
    return { label: 'Sunny', icon: '☀️' };
  if ([1, 2].includes(weatherCode)) 
    return { label: 'Partly cloudy', icon: '🌤️' };
  if (weatherCode === 3) 
    return { label: 'Cloudy', icon: '☁️' };
  if ([45, 48].includes(weatherCode)) 
    return { label: 'Foggy', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(weatherCode)) 
    return { label: 'Drizzle', icon: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) 
    return { label: 'Rainy', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) 
    return { label: 'Snowy', icon: '❄️' };
  if ([95, 96, 99].includes(weatherCode)) 
    return { label: 'Stormy', icon: '⛈️' };

  return { label: 'Clear', icon: '🌈' };
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function applyFontSize(size) {
  root.dataset.fontSize = size;
  localStorage.setItem(STORAGE_KEYS.fontSize, size);
}

function hydratePreferences() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const savedFont = localStorage.getItem(STORAGE_KEYS.fontSize);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  applyFontSize(savedFont || 'normal');
}

hydratePreferences();

themeToggle.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

fontSmaller.addEventListener('click', () => applyFontSize('small'));
fontReset.addEventListener('click', () => applyFontSize('normal'));
fontLarger.addEventListener('click', () => applyFontSize('large'));

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('is-open');
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
    });
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    sessionCards.forEach((card) => {
      const category = card.dataset.category;
      const show = filter === 'all' || category === filter;
      card.hidden = !show;
    });
  });
});

faqItems.forEach((item) => {
  const summary = item.querySelector('summary');
  const content = item.querySelector('.faq-content');

  if (!summary || !content) return;

  content.style.transition = 'height 280ms ease, opacity 220ms ease';

  if (item.open) {
    content.style.height = 'auto';
    content.style.opacity = '1';
  }

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    if (item.dataset.animating === 'true') return;
    item.dataset.animating = 'true';

    const isOpen = item.open;

    if (!isOpen) {
      item.open = true;
      content.style.height = '0px';
      content.style.opacity = '0';

      requestAnimationFrame(() => {
        content.style.height = `${content.scrollHeight}px`;
        content.style.opacity = '1';
      });

      const onOpenEnd = (transitionEvent) => {
        if (transitionEvent.propertyName !== 'height') return;
        content.style.height = 'auto';
        item.dataset.animating = 'false';
        content.removeEventListener('transitionend', onOpenEnd);
      };

      content.addEventListener('transitionend', onOpenEnd);
      return;
    }

    content.style.height = `${content.scrollHeight}px`;
    content.style.opacity = '1';

    requestAnimationFrame(() => {
      content.style.height = '0px';
      content.style.opacity = '0';
    });

    const onCloseEnd = (transitionEvent) => {
      if (transitionEvent.propertyName !== 'height') return;
      item.open = false;
      item.dataset.animating = 'false';
      content.removeEventListener('transitionend', onCloseEnd);
    };

    content.addEventListener('transitionend', onCloseEnd);
  });
});

async function loadWeather() {
  const container = document.getElementById('weather-output');
  try {
    const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=51.0154&longitude=-3.1027&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error('Weather request failed');
    const data = await response.json();

    const current = data.current || {};
    const hourlyTimes = data.hourly?.time?.slice(0, 3) || [];
    const hourlyTemps = data.hourly?.temperature_2m?.slice(0, 3) || [];
    const hourlyCodes = data.hourly?.weather_code?.slice(0, 3) || [];
    const currentWeather = getWeatherPresentation(current.weather_code);

    container.innerHTML = `
      <div class="weather-main">
        <div>
          <div class="weather-current">
            <p class="weather-temp">${Math.round(current.temperature_2m ?? 0)}°C</p>
            <div class="weather-condition" aria-label="${currentWeather.label}">
              <span class="weather-icon" aria-hidden="true">${currentWeather.icon}</span>
              <span class="weather-label">${currentWeather.label}</span>
            </div>
          </div>
          <p class="weather-meta">Feels like ${Math.round(current.apparent_temperature ?? 0)}°C · wind ${Math.round(current.wind_speed_10m ?? 0)} km/h</p>
        </div>
        <div>
          <p class="weather-meta"><strong>Taunton</strong><br/>Live conditions via API</p>
        </div>
      </div>
      <div class="weather-list">
        ${hourlyTimes.map((time, index) => {
          const hour = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const hourlyWeather = getWeatherPresentation(hourlyCodes[index]);
          return `<article><strong>${hour}</strong><span>${hourlyWeather.icon} ${Math.round(hourlyTemps[index] ?? 0)}°C</span><p class="weather-small-label">${hourlyWeather.label}</p></article>`;
        }).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<p class="loading">Weather data is unavailable right now, but the API component is configured and can be tested with an internet connection.</p>';
  }
}

loadWeather();

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const interest = String(formData.get('interest') || '').trim();
  const message = String(formData.get('message') || '').trim();

  if (!name || !email || !message) {
    feedback.textContent = 'Please complete your name, email and message before continuing.';
    return;
  }

  const subject = encodeURIComponent(`Website enquiry - ${interest}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInterest: ${interest}\n\nMessage:\n${message}`);
  const mailto = `mailto:info@unicornbadminton.club?subject=${subject}&body=${body}`;

  feedback.textContent = 'Your email app should open now with the enquiry pre-filled.';
  window.location.href = mailto;
});
