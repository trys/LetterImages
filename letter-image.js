const Letters = (() => {
  // First, gather our elements early doors and back out if they're missing
  const canvas = document.querySelector('canvas');
  const output = document.querySelector('output');
  const input = document.querySelector('input');

  if (!canvas || !output || !input) {
    return;
  }

  // Constants
  const IS_COLOUR = true;
  const IS_INVERTED = false;
  const FADE_TIME = 1200;
  const PROSE =
    'Echo park cray pabst single-origin coffee tattooed. Polaroid yuccie etsy shoreditch, disrupt butcher authentic art party helvetica. Authentic kale chips keytar glossier shoreditcLetters.helpers. Chia lumbersexual mustache everyday carry mlkshk. Tacos farm-to-table craft beer, literally fingerstache 3 wolf moon poutine cardigan adaptogen roof party YOLO cornhole pork belly. Leggings adaptogen raclette fam bicycle rights bushwick stumptown venmo locavore woke. Authentic swag live-edge knausgaard, prism messenger bag waistcoat pop-up jean shorts bitters viral actually coloring book wayfarers. Sartorial mixtape iPhone before they sold out plaid hoodie. Portland pabst before they sold out woke banjo sartorial 3 wolf moon. Roof party enamel pin subway tile venmo, vexillologist cold-pressed occupy selfies seitan cliche offal mlkshk intelligentsia tumblr wayfarers. Glossier organic vexillologist lomo fixie.';

  // Setup the canvas context and fragment
  const ctx = canvas.getContext('2d');
  canvas.width = output.clientWidth;
  canvas.height = output.clientHeight;
  const fragment = document.createDocumentFragment();

  return {
    init: () => {
      // Attach event handlers for inputs and URL changes
      window.addEventListener('hashchange', () => Letters.kickOff());
      input.addEventListener('change', Letters.inputChange);

      // Let's get this ball a rollin'
      Letters.kickOff();
    },

    /**
     * The main attraction
     *
     * @param url string | null
     */
    kickOff: async (url = null) => {
      try {
        await Letters.loading();

        /*
         * For permanent images, get the image no. from the hash
         * Note, the image loader has an error handler, so if somebody puts
         * an incorrect image id, it'll be picked up there, so we don't need
         * to worry about it here.
         */
        if (!url) {
          const n = Number(window.location.hash.replace('#', '')) || 1;
          url = `/images/image-${n}.jpg`;
        }

        await Letters.loadImage(url);
        Letters.fillGrid();

        await Letters.clearGrid();
        output.appendChild(fragment);
        await Letters.fadeInGrid();
      } catch (e) {
        await Letters.handleError();
      }
    },

    /**
     * Handle the file input picker
     *
     * @param event Event
     */
    inputChange: async event => {
      try {
        await Letters.loading('Loading file');
        if (!event.target.files[0]) {
          throw new Error();
        }

        // Grab the image from FileReader and pass it to our kickOff function
        const url = await Letters.loadFile(event.target.files[0]);
        Letters.kickOff(url);
      } catch (e) {
        await Letters.handleError();
      }
    },

    /**
     * Load the image via FileReader, but wrapped in a promise
     *
     * @param file File
     */
    loadFile: file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    /**
     * Load the image onto the canvas and handle the sizing of it, again
     * wrapped in a promise.
     *
     * @param url String
     */
    loadImage: url => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      return new Promise(async (resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = function() {
          let { width, height } = img;
          let x = 0;
          let y = 0;

          // Object-fit for canvas
          if (img.height > img.width) {
            height = canvas.height;
            width = img.width * (height / img.height);
            x = (canvas.width - width) / 2;
            y = 0;
          } else {
            width = canvas.width;
            height = img.height * (width / img.width);
            x = 0;
            y = (canvas.height - height) / 2;
          }

          ctx.drawImage(img, x, y, width, height);

          img.style.display = 'none';
          resolve();
        };

        img.onerror = reject;
      });
    },

    /**
     * This is the function where we analyse the image and create the letters
     */
    fillGrid: () => {
      const across = 100;
      const down = 77;
      const xNum = canvas.width / across;
      const yNum = canvas.height / down;

      // Loop the two axis and get the image data from the canvas
      for (let y = 0; y < down; y++) {
        for (let x = 0; x < across; x++) {
          const { data } = ctx.getImageData(x * xNum, y * yNum, across, down);

          // For colour, use RGB, else use white
          const colour = IS_COLOUR
            ? `${data[0]}, ${data[1]}, ${data[2]}`
            : '255, 255, 255';

          // For colour, read the alpha channel, else calculate brightness manually
          let alpha = IS_COLOUR ? data[3] : Letters.helpers.getDarkness(data);
          if (IS_INVERTED) {
            alpha = 1 - alpha;
          }

          // Call the helper function to create the coloured-in span
          Letters.helpers.createLetter(
            Letters.helpers.nextLetter(),
            `rgba(${colour}, ${alpha})`
          );
        }
      }
    },

    clearGrid: async () => {
      await Letters.fadeOutGrid();
      output.innerHTML = '';
      fragment.innerHTML = '';
    },

    loading: async (message = 'Preparing image') => {
      await Letters.clearGrid();
      output.innerHTML = `<strong class="loading">${message}</strong>`;
      await Letters.fadeInGrid();
    },

    handleError: async () => {
      await Letters.clearGrid();
      output.innerHTML =
        '<strong class="error">There was a problem loading that image</strong>';
      await Letters.fadeInGrid();
    },

    // A bit of a quick n' dirty transition resolution tracker
    fade: () => {
      return new Promise(resolve => {
        setTimeout(resolve, FADE_TIME);
      });
    },

    fadeInGrid: () => {
      // Back out early if we're already 'in'
      if (output.classList.contains('in')) {
        return Promise.resolve();
      } else {
        output.classList.add('in');
        return Letters.fade();
      }
    },

    fadeOutGrid: () => {
      // Back out early if we're already 'out'
      if (!output.classList.contains('in')) {
        return Promise.resolve();
      } else {
        output.classList.remove('in');
        return Letters.fade();
      }
    },

    helpers: {
      /**
       * Make a span and put it into the fragment
       */
      createLetter: (letter = '', style = 0) => {
        const el = document.createElement('span');
        el.textContent = letter;
        if (typeof style === 'number') {
          el.style.opacity = style;
        } else {
          el.style.color = style;
        }
        fragment.appendChild(el);
      },

      /**
       * InvLerping the 0-255 range to 0-1
       *
       * Read more: https://www.trysmudford.com/blog/linear-interpolation/
       */
      invlerp: (a, b, v) => Letters.helpers.clamp((v - a) / (b - a)),
      clamp: (v, min = 0, max = 1) => Math.min(max, Math.max(min, v)),
      getDarkness: data => {
        const r = Letters.helpers.invlerp(0, 255, data[0]);
        const g = Letters.helpers.invlerp(0, 255, data[1]);
        const b = Letters.helpers.invlerp(0, 255, data[2]);
        const a = Letters.helpers.invlerp(0, 100, data[3]);

        return (r + g + b) / 3;
      },

      /**
       * Get the next letter from the long string by looping the count
       */
      count: -1,
      nextLetter: () => {
        Letters.helpers.count++;
        if (Letters.helpers.count > PROSE.length) {
          Letters.helpers.count = 0;
        }

        return PROSE[Letters.helpers.count];
      }
    }
  };
})();

Letters.init();
