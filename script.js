// Tracks viewed paths only within one graph session
let viewedPaths = new Set();

const fileInput = document.getElementById("codeFile");
const fileBtn = document.getElementById("fileBtn");
const fileName = document.getElementById("fileName");

let lastUploadedFileName = null;
let loadedTextFromFile = "";      /* permet de savoir si le texte du fichier a été modifié */


// Use constants for magic values
const COLORS = {
    CIRCULAR_EDGE: 'rgb(209, 11, 11)',
    PATH_HIGHLIGHT: '#562aa8ff',
    CIRCULAR_NODE_BORDER: 'rgb(210, 62, 218)',
    NORMAL_EDGE: 'rgba(97, 97, 91, 1)',
    SIZING: {
        NODE_FONT_SIZE: 14,
        EDGE_WIDTH: 4,
        EDGE_WIDTH_PATH: 6,
        EDGE_WIDTH_THICK: 5,
        ARROW_SCALE: 0.6,
    },

};
const default_node_shape = {
    nodes: {
        color: {
            background: "#a8c9f4ff",
            border: "#314c3cff",
        },
        shape: "circle",
        size: 35,
        font: {
            size: 16,
            color: "#f7efefff",                              
            face: "arial",
            align: "center",
            bold: true 

        },
        borderWidth: 4,
        margin: 15,

    },
    edges: {
        width: 6,
        arrows: {
            to: { enabled: true, scaleFactor: 0.5}
        },
        length: 200,
        physics: false,
        shadow: true,
    },

}

const GRAPH_OPTIONS = {

    physics: {
        enabled: true,
        solver: 'barnesHut', 
        barnesHut: {
            gravitationalConstant: -15000,
            centralGravity: 0.5,
        },
        minVelocity: 0.75,
        stabilization: {
            iterations: 200,
        }
        ,
    },

    layout: {
        improvedLayout: true,

    },
    interaction: {
        dragNodes: true,
        zoomView: true,
        dragView: true,
        hover: false,
        selectConnectedEdges: true
    }
};


/**
 * Main function: applies the settings and generates results + graphs
 * This function get the inputs and computes + toggle the results
 */
function appliquerParametres() {
    let codeSaisi = document.getElementById('codeBrutInput').value;
    const couleur = document.getElementById('couleurGraphique').value;
    const affichageDiv = document.getElementById('affichageParametres');
  
    const graphListContainer = document.getElementById('graph-list');

    viewedPaths.clear();

    // Converts the text into an array of lines → words (same logic as Code1)
    const codes = codeSaisiToArray(codeSaisi);

    graphListContainer.innerHTML = '';
    affichageDiv.innerHTML = '';

    // No code entered
    if (codes.length === 0) {
        affichageDiv.innerHTML = `<p class="text-red-500">Please enter code to analyze.</p>`;
     
       return; 
    }   

    let resultsHTML = '';
    let tousCodesValides = true;
    let grapheCompteur = 0;
    
    // Iterate over each line entered by the user
    codes.forEach((ligne, index) => {

        const isCode = isItCode(ligne);
        let isCircular = false;

        const L = ligne.length > 0 ? ligne[0].length : 0;
        const isUniform = L > 0 && ligne.every(mot => mot.length === L);

        let classification = '';   // classification comma-free
        let statutCircular = '';

        //  If the line is a uniform code -> test circularity and build G(X)
        if (isCode && isUniform) {
            isCircular = isItCircular(ligne);
            if (isCircular) {
                statutCircular = ' and is circular';
            } else {
                statutCircular = ' but isn\'t circular';
            }    
        } else if (isCode && !isUniform) {
            statutCircular = ' (non uniform)';
        } else if (!isCode) {
            const cleanedCode = ligne.map(mot => mot.trim());
            const motsSet = new Set(cleanedCode);

            if (motsSet.size !== cleanedCode.length) {
                statutCircular = ' (duplicate detected)';
            } else {
                statutCircular = ' (non atomic)';
            }    
        }    

        const statut = isCode ? 'It\'s a code' : "It's not a code";

        const couleurStatut = (isCode && isCircular) ? 'green' : 'red';

        // Calculate the alphabet
        const motsConcatenes = ligne.join('');
        const alphabetSet = new Set([...motsConcatenes]);
        const alphabetAffiche = [...alphabetSet].sort().join(', ');

        if (!isCode) {
            tousCodesValides = false;
        }    
        if (isCode) {
            grapheCompteur++;
            const graphId = `graph-${index}-container`;
            const componentsContainerId = `${graphId}-components`;

            // 1. Créer le conteneur HTML pour ce graphe
            const graphTitle = `<h4 class="text-base font-bold mb-2">Graph for the line ${index +1}</h4>`;
            const graphDiv = document.createElement('div');
            graphDiv.id = graphId;
            graphDiv.className = 'w-full border border-gray-300 rounded-lg mb-4';

            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'mb-6 border border-gray-300 rounded-lg p-4 bg-white shadow-sm';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex items-center justify-between mb-2';

            const rightBox = document.createElement('div');
            rightBox.className = 'flex items-center gap-2';


            const pngBtn = document.createElement('button');
            pngBtn.type = 'button';
            pngBtn.textContent = 'PNG';
            pngBtn.className = 'graph-btn';

            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.type = 'button';
            fullscreenBtn.textContent = 'Full Screen';
            fullscreenBtn.className = 'graph-btn';
            fullscreenBtn.id = 'full-screen'

            rightBox.appendChild(pngBtn);

            headerDiv.appendChild(rightBox);
            rightBox.appendChild(fullscreenBtn);

            const componentsContainer = document.createElement('div');
            componentsContainer.id = componentsContainerId;
            componentsContainer.style.display = 'none';
            componentsContainer.className = 'mt-2 space-y-2';

            wrapperDiv.innerHTML = graphTitle;

            wrapperDiv.appendChild(headerDiv);
            wrapperDiv.appendChild(graphDiv);
            wrapperDiv.appendChild(componentsContainer);

            graphListContainer.appendChild(wrapperDiv);

            /* Export PNG du graphe */
            pngBtn.addEventListener('click', () => {
                const network = graphDiv.visNetwork;
                if (!network || !network.canvas || !network.canvas.frame) {
                    console.error("Canvas non disponible pour l'export PNG.");
                    return;
                }    

                const canvas = network.canvas.frame.canvas;

                // Create a temporary canvas with white background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Draw the graph on the white background
                tempCtx.drawImage(canvas, 0, 0);

                // Exportation of the temporary canvas (the image we download)
                const dataUrl = tempCanvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `GX_ligne_${index + 1}.png`;
                a.click();
            });
            
            fullscreenBtn.addEventListener('click', () => {
                const wrapper = wrapperDiv;

                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    if (wrapper.requestFullscreen) {
                        wrapper.requestFullscreen();
                    } else if (wrapper.webkitRequestFullscreen) {
                        wrapper.webkitRequestFullscreen();
                    } else if (wrapper.msRequestFullscreen) {
                        wrapper.msRequestFullscreen();
                    }
                }
            });

            const n = (ligne.length > 0 ? ligne[0].length : 0);

            // Draw the graph to a new container
            // Checking if vis is really imported
            if (typeof vis !== 'undefined' && vis.DataSet) {
                classification = dessinerGraphe(ligne, graphId, couleur, index);
            } else {
                document.getElementById(graphId).innerHTML = "<p class='text-red-500 p-2'>Erreur: La bibliothèque Vis.js n'a pas pu être chargée.</p>";
            }    
        }    

        /* Building of the informations about words  */
        let motsHTML = "";

        const styleAlphabet = `font-weight:600;`;
        const styleLabel = `font-weight:600;`;
        const styleWords = `font-size:11.5px; line-height:1.35; display:block;`;

        /* If uniform and a code : toggle alphabet, length and words */
        if (isCode && isUniform) {
            motsHTML = `
                <div class="text-xs text-gray-700 ml-2">
                    <div style="${styleLabel}">
                        Alphabet :
                        <span class="font-mono" style="${styleAlphabet}">{${alphabetAffiche}}</span>
                    </div>    
                    <div style="margin-top:2px; ${styleLabel}">
                        Word length : <span style="font-weight:600;">${L}</span>
                    </div>    
                    <div style="margin-top:3px; ${styleWords}">
                        <span style="${styleLabel}">Words :</span>
                        ${ligne.join(', ')}
                    </div>    
                </div>    
            `;    
        }    

        /* If not uniform but is a code toggle alphabet, words by length */
        else if (isCode && !isUniform) {
            const groupes = {};
            for (const w of ligne) {
                const len = w.length;
                if (!groupes[len]) groupes[len] = [];
                groupes[len].push(w);
            }    
            const longueursTriees = Object.keys(groupes).sort((a, b) => a - b);
            let groupHTML = `
                <div style="${styleLabel}">
                    Alphabet :
                    <span class="font-mono" style="${styleAlphabet}">{${alphabetAffiche}}</span>
                </div>    
            `;    
            for (const len of longueursTriees) {
                groupHTML += `
                    <div style="margin-top:6px; ${styleWords}">
                        <span style="${styleLabel}">Words (length ${len}) :</span>
                        ${groupes[len].join(', ')}
                    </div>    
                `;    
            }    
            motsHTML = `
                <div class="text-xs text-gray-700 ml-2">
                    ${groupHTML}
                </div>    
            `;    
        }    
        /* if it's not a code toggle of words and alphabet */
        else {
            motsHTML = `
                <div class="text-xs text-gray-700 ml-2" style="${styleWords}">
                    <span style="${styleLabel}">Mots :</span> ${ligne.join(', ')}
                    <br>
                    <span style="${styleLabel}">Alphabet :</span>
                    <span class="font-mono">{${alphabetAffiche}}</span>
                </div>    
            `;    
        }    
        /* Concatenation in the final block of information */
        resultsHTML += `
        <div class="mb-2 p-2 rounded-md ${isCode ? 'bg-green-50' : 'bg-red-50'}">
            <p class="text-sm font-semibold">Line ${index +1} :
                <span style="color: ${couleurStatut}; font-weight: bold;">
                    ${statut}${statutCircular}${classification}
                </span> (${ligne.length} words)    
            </p>    
            ${motsHTML}
        </div>    
        `;
    });    

    /* Overall summary */
    const titre = tousCodesValides
        ? "Global Statut : All sets are atomic."
        : "Global Statur : Some lines are not atomic.";

    affichageDiv.innerHTML = `    
        <h3 class="text-lg mb-3">${titre}</h3>
        ${resultsHTML}
    `;    
}    

// HELPER FUNCTIONS
function createNodesDataSet(nodesData, couleur, options = {}) {
    const mergedOptions = { ...default_node_shape.nodes, ...options };

    return new vis.DataSet(
        nodesData.map(node => ({
            id: node.id,
            label: node.label,
            size: mergedOptions.size,

            font: mergedOptions.font,
            shape: mergedOptions.shape,
            borderWidth: mergedOptions.borderWidth,
            margin: mergedOptions.margin,
            shadow: mergedOptions.shadow,

            color: {
                background: couleur || mergedOptions.color.background, 
                border: mergedOptions.color.border     // always keep border color consistent
            }
        }))
    );
}


function createEdgesDataSet(edgesData, couleur, options = {}) {
    const mergedOptions = { ...default_node_shape.edges, ...options };


    return new vis.DataSet(
        edgesData.map(edge => ({
            from: edge.from,
            to: edge.to,

            arrows: edge.arrows || mergedOptions.arrows,
            color:  edge.color || mergedOptions.color,
            width: edge.width || mergedOptions.width,
            label: edge.label || null
        }))
    );
}

function setupGraphOptions(customOptions = {}) {
    return {
        physics: GRAPH_OPTIONS.physics,        // Juste la physique
        interaction: GRAPH_OPTIONS.interaction, // Juste l'interaction
        layout: GRAPH_OPTIONS.layout
    };
}

function createNodesFromMap(nodesMap) {
    return Array.from(nodesMap.entries()).map(([label, id]) => ({
        id, label
    }));
}
// Single graph creation point
function createOrUpdateGraph(container, nodes, edges, couleur, circular) {
    const nodeOptions = circular ? {
        border: COLORS.CIRCULAR_NODE_BORDER,
        borderWidth: 2.5
    } : {
        borderWidth: 2,
    };

    const nodesDS = createNodesDataSet(nodes, couleur, nodeOptions);

    const edgesDS = createEdgesDataSet(edges, couleur);

    /* 3. Dessin du graphe */
    const data = { nodes: nodesDS, edges: edgesDS };
    const options = setupGraphOptions();

    if (container.visNetwork) {
        container.visNetwork.destroy();
    }
    container.visNetwork = new vis.Network(container, data, options);

    container.style.width = "100%";
    container.style.height = "500px";
    container.visNetwork.fit();
}



/**
 * Converts a raw code string into a 2D array (list of lists).
 * Each element of the main list is a line,
 * and each line is a list of words/tokens.
 * @param {string} codeEntered - The raw string entered in the textarea.
 * @returns {Array<Array<string>>} An array of lines, where each line is an array of words.
 */
function codeSaisiToArray(codeSaisi) {
    const lignes = codeSaisi.replace(/\r/g, '').split('\n');
    const codeParLigneEtMot = [];
    for (const ligne of lignes) {
        const mots = ligne.trim().split(/\s+/);
        const estVide = (mots.length === 1 && mots[0] === '');
        if (!estVide) {
            codeParLigneEtMot.push(mots);
        }
    }
    return codeParLigneEtMot;
}

/**
 * Checks if the entered list is a code or not
 * Tests only based on length.
 * @param {Array<string>} code - The list of codes to test
 * @returns {Boolean} true if it is a code, false otherwise
 */

function isItCode(code) {
    if (!code || code.length === 0) return false;

    // Create the standardized array for testing..
    const cleanedCode = code.map(mot => mot.trim());
    const motsSet = new Set(cleanedCode); // Le Set est créé à partir des mots nettoyés

    // 1. DUPLICATE CHECK
    if (motsSet.size !== cleanedCode.length) {
        return false;
    }

    // 2. UNIFORMITY CHECK
    const referenceLength = cleanedCode[0].length;
    const isUniform = cleanedCode.every(w => w.length === referenceLength);
    if (isUniform) {
        return true;
    }

    // 3. CONCATENATION CHECK (if non-uniform)
    for (const w of cleanedCode) {
        if (w.length <= 1) continue;
        for (let i = 1; i < w.length; i++) {
            const a = w.substring(0, i);
            const b = w.substring(i);
            if (motsSet.has(a) && motsSet.has(b)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Checks if a set of words (code) is circular.
 * A code X is circular if, for any concatenation of two words u, v ∈ X,
 * the sequence uv written on a cycle cannot be split into words from X.
 * @param {Array<string>} codes - The list of words (set X), assumed to have no duplicates.
 * @returns {boolean} Returns true if the code is circular, false otherwise.
 */
function isItCircular(codes) {
    const L = codes[0].length;
    const set = new Set(codes);

    for (const u of codes) {
        for (const v of codes) {
            const w = u + v;
            for (let k = 1; k < 2 * L; k++) {
                if (k % L === 0) continue;
                const w2 = w.substring(k) + w.substring(0, k);
                const a = w2.substring(0, L);
                const b = w2.substring(L, 2 * L);
                if (set.has(a) && set.has(b)) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Compute the longest path in a graph
 * @param {Map} nodes - The map of the nodes of the final graph
 * @param {Map} edged - The map of the edges of the final graph
 * @returns {list} Returns the max length, the path and the edges
 */
function longestPathsInGraph(nodes, edges) {
    // Adjacence avant / arrière
    const adj = new Map();
    const revAdj = new Map();
    const indeg = new Map();

    nodes.forEach(n => {
        adj.set(n.id, []);
        revAdj.set(n.id, []);
        indeg.set(n.id, 0);
    });

    edges.forEach(e => {
        adj.get(e.from).push(e.to);
        revAdj.get(e.to).push(e.from);
        indeg.set(e.to, indeg.get(e.to) + 1);
    });

    // Tri topologique (Kahn)
    const queue = [];
    indeg.forEach((d, id) => {
        if (d === 0) queue.push(id);
    });
    const nodesCount = nodes.length;
    
    const topo = [];
    while (queue.length > 0) {
        const u = queue.shift();
        topo.push(u);
        adj.get(u).forEach(v => {
            indeg.set(v, indeg.get(v) - 1);
            if (indeg.get(v) === 0) queue.push(v);
        });
    }
    if (topo.length !== nodesCount) {
        // Cycle détecté : le nombre de nœuds triés est inférieur au nombre total de nœuds.
        
        const topoSet = new Set(topo);
        const cyclicNodeIds = [];
        
        // Identifie les nœuds qui n'ont pas été inclus dans le tri topologique
        nodes.forEach(n => {
            if (!topoSet.has(n.id)) {
                cyclicNodeIds.push(n.id);
            }
        });

        // Retourne un statut spécial pour indiquer le cycle et les nœuds concernés
        return { 
            maxLength: -1, // Statut d'échec
            paths: [], 
            edgeKeys: [],
            cyclicNodeIds: cyclicNodeIds // IDs des nœuds faisant partie d'un cycle
        };
    }
    const dist = new Map();
    nodes.forEach(n => dist.set(n.id, 0));

    topo.forEach(u => {
        adj.get(u).forEach(v => {
            if (dist.get(v) < dist.get(u) + 1) {
                dist.set(v, dist.get(u) + 1);
            }
        });
    });

    let maxLen = 0;
    dist.forEach(d => {
        if (d > maxLen) maxLen = d;
    });

    if (maxLen === 0) {
        return { maxLength: 0, paths: [], edgeKeys: [] };
    }

    const labelById = new Map(nodes.map(n => [n.id, n.label]));
    const paths = [];
    const edgeKeySet = new Set();

    function backtrack(nodeId, currentIds, remaining) {
        if (remaining === 0) {
            const labels = currentIds.slice().reverse().map(id => labelById.get(id));
            paths.push(labels);

            const idsReversed = currentIds.slice().reverse();
            for (let i = 0; i < idsReversed.length - 1; i++) {
                const eKey = `${idsReversed[i]}-${idsReversed[i + 1]}`;
                edgeKeySet.add(eKey);
            }
            return;
        }

        const preds = revAdj.get(nodeId) || [];
        preds.forEach(p => {
            if (dist.get(p) === dist.get(nodeId) - 1) {
                currentIds.push(p);
                backtrack(p, currentIds, remaining - 1);
                currentIds.pop();
            }
        });
    }

    dist.forEach((d, id) => {
        if (d === maxLen) {
            backtrack(id, [id], maxLen);
        }
    });

    return {
        maxLength: maxLen,
        paths,
        edgeKeys: Array.from(edgeKeySet)
    };
}


/**
 * Draw G(X) 
 * @param {Map} codeX - The list of words to draw
 * @param {string} containerId - div where the graph will be draw
 * @param {string} couleur - color of the graph
 * @returns {list} Returns the differents components
 */
function dessinerGraphe(codeX, containerId, couleur) {
    if (typeof vis === 'undefined' || !vis.DataSet) {
        console.error("Vis.js n'est pas chargé. Impossible de dessiner le graphe.");
        return;
    }

    let container = document.getElementById(containerId);
    const n = codeX[0].length;
    const nodesMap = new Map();
    let nodeIdCounter = 1;
    const edges = [];
    let circular = false;
    if (n < 2){
        if (n === 1) {
        for (const word of codeX) {
            if (!nodesMap.has(word)) {
                nodesMap.set(word, nodeIdCounter++);
            }
        }
        let nodes = createNodesFromMap(nodesMap);
        createOrUpdateGraph(container, nodes, [], couleur, false);
        }
        return '';
    }

    for (const word of codeX) {
        for (let i = 1; i < n; i++) {
            const prefix = word.substring(0, i);
            const suffix = word.substring(i);
            // If suffix = prefix then loop on himself
            if (prefix === suffix) {
                if (!nodesMap.has(prefix)) nodesMap.set(prefix, nodeIdCounter++);
                if (!nodesMap.has(suffix)) nodesMap.set(suffix, nodeIdCounter++);
                edges.push({
                    from: nodesMap.get(prefix),
                    to: nodesMap.get(suffix),
                    arrow: 'to',
                    color: { color: COLORS.CIRCULAR_EDGE },
                    width: COLORS.SIZING.EDGE_WIDTH_PATH,

                });
                circular = true;
            }
            else {
                // if suffix and prefix already existing then check if there is a relationship 
                if (nodesMap.has(prefix) && nodesMap.has(suffix)) {
                    const prefixId = nodesMap.get(prefix);
                    const suffixId = nodesMap.get(suffix);

                    var existe_deja = false;
                    for (const edge of edges) {
                        // Vérifier si l'arête connecte le préfixe et le suffixe dans n'importe quel sens --------2 node aller retour 
                        if (
                            (edge.from === prefixId && edge.to === suffixId) ||
                            (edge.from === suffixId && edge.to === prefixId)) {
                            edge.color = { color: COLORS.CIRCULAR_EDGE };
                            edge.width = COLORS.SIZING.EDGE_WIDTH_PATH;
                            existe_deja = true
                        }
                    }
                    if (existe_deja) {
                        edges.push({
                            from: prefixId,
                            to: suffixId,
                            arrows: 'to',
                            color: { color: COLORS.CIRCULAR_EDGE },
                            width: COLORS.SIZING.EDGE_WIDTH_PATH,
                        });
                        circular = true;
                    }
                    else {
                        edges.push({
                            from: prefixId,
                            to: suffixId,
                            arrows: 'to',
                            color: COLORS.NORMAL_EDGE,
                        });
                    }
                }
                else {
                    if (!nodesMap.has(prefix)) {
                        nodesMap.set(prefix, nodeIdCounter++);
                    }
                    if (!nodesMap.has(suffix)) {
                        nodesMap.set(suffix, nodeIdCounter++);
                    }
                    const fromId = nodesMap.get(prefix);
                    const toId = nodesMap.get(suffix);

                    // Creating oriented edge [prefix, suffix] 
                    edges.push({
                        from: fromId,
                        to: toId,
                        arrows: 'to',
                    });
                }
            }
        }
    }

    let nodes = createNodesFromMap(nodesMap);
    let results = [];
    let classification = '';

    if (!circular) {

        let nodesPath = createNodesFromMap(nodesMap);

        results = longestPathsInGraph(nodesPath, edges);
        
        if (results.maxLength === -1) {
            circular = true; // Force l'état circulaire pour la coloration finale et l'affichage
            statutCircular = false;
            classification = '';
        }
        else {
            if (results.paths.length > 0){
                const infoDiv = document.createElement('div');
                infoDiv.className = 'graph-info';
        
                infoDiv.innerHTML = `
                    <div><strong><em>Length of the longest path : ${results.maxLength}</em></strong><div>
                    <div><label class="select-path-label">Choose a path to color :</label><div>
                    <div class="dropdown">
                        <div class="dropdown-selected">&nbsp;</div>
                        <div class="dropdown-list"></div>
                    </div>
                `;
                // Add classification (strong comma-free, comma-free, etc.)
                if (results.maxLength === 1) {
                    classification = ' (strong comma-free code)';
                } else if (results.maxLength === 2) {
                    classification = ' (comma-free code)';
                } else if (results.maxLength > 2) {
                    classification = ' (non comma-free)';
                } else {
                    classification = ' (graph without edges)';
                }
                const dropdown = infoDiv.querySelector('.dropdown');
                const selectedEl = infoDiv.querySelector('.dropdown-selected');
                const listEl = infoDiv.querySelector('.dropdown-list');
        
                /* Add to the list all of the paths possible */
                results.paths.forEach((chemin, i) => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.dataset.index = String(i);
                    item.textContent = chemin.join(' → ');
        
                    /* Highlighting path already consulted */
                    if (viewedPaths.has(i)) {
                        item.classList.add('viewed');
                    }
        
                    listEl.appendChild(item);
                });
        
                /* Highligting the first path of the list */
                viewedPaths.add(0);
        
                /* Getting the first path of the list */
                selectedEl.textContent = results.paths[0].join(' → ');
        
                /* Display the path corresponding */
                listEl.querySelectorAll('.dropdown-item').forEach((el) => {
                    const idx = parseInt(el.dataset.index, 10);
                    if (viewedPaths.has(idx)) {
                        el.classList.add('viewed');
                    }
                });
        
                /* Put the path on the header */
                if (results.paths.length > 0) {
                    viewedPaths.add(0);
                    selectedEl.textContent = results.paths[0].join(' → ');
                }
        
                /* interactions on the list */
                dropdown.addEventListener('click', (event) => {
                    if (
                        event.target instanceof HTMLElement &&
                        event.target.classList.contains('dropdown-item')
                    ) {
                        return;
                    }
                    dropdown.classList.toggle('open');
                });
        
                /* Updating the path selected */
                listEl.addEventListener('click', (event) => {
                    const target = event.target;
                    if (!(target instanceof HTMLElement)) return;
        
                    const item = target.closest('.dropdown-item');
                    if (!item) return;
        
                    const index = parseInt(item.dataset.index, 10);
                    if (Number.isNaN(index)) return;
        
                    colorierChemin(index);
        
                    viewedPaths.add(index);
        
                    selectedEl.textContent = results.paths[0].join(' → ');
        
                    listEl.querySelectorAll('.dropdown-item').forEach((el) => {
                        const idx = parseInt(el.dataset.index, 10);
                        if (viewedPaths.has(idx)) {
                            el.classList.add('viewed');
                        }
                    });
        
                    dropdown.classList.remove('open');
                });
        
                function colorierChemin(index) {
                    // 1. Reset all edges to default
                    for (const edge of edges) {
                        // edge.color = { color: couleur }; // Default color
                        edge.width = COLORS.SIZING.EDGE_WIDTH; // Default width
                    }
        
                    const chemin = results.paths[index];
                    const idByLabel = new Map(Array.from(nodesMap.entries()).map(([label, id]) => [label, id]));
        
                    // 2. Color only the path edges
                    for (let i = 0; i < chemin.length - 1; i++) {
                        const fromLabel = chemin[i];
                        const toLabel = chemin[i + 1];
                        const fromId = idByLabel.get(fromLabel);
                        const toId = idByLabel.get(toLabel);
        
                        // Find and color the edge between these nodes
                        for (const edge of edges) {
                            if (edge.from === fromId && edge.to === toId) {
                                edge.color = { color: COLORS.PATH_HIGHLIGHT };  // coloeur purpul path
                                edge.width = COLORS.SIZING.EDGE_WIDTH_THICK;
                                break; // Found it, move to next edge
                            }
                        }
                    }
        
                    // 3. Update ONLY the edges in the graph
                    if (container.visNetwork) {
                        // Get existing nodes (unchanged)
                        const existingNodes = container.visNetwork.body.data.nodes;
        
                        // Update only edges
                        container.visNetwork.setData({
                            nodes: existingNodes, // Keep nodes as they are
                            edges: new vis.DataSet(edges) // Update edges only
                        });
                    }
                }
        
                container.parentNode.insertBefore(infoDiv, container);
            } else {
                classification = ' (graph without edges)';
            }
        }
    }
    if (circular) {
        const cycleNodeSet = new Set(results.cyclicNodeIds || []);
        for (const edge of edges) {
            let isCycleEdge = false;
            
            if (edge.color && edge.color.color === COLORS.CIRCULAR_EDGE) {
                isCycleEdge = true;
            } 
            
            else if (results.maxLength === -1) {
                if (cycleNodeSet.has(edge.from) && cycleNodeSet.has(edge.to)) {
                    isCycleEdge = true;
                }
            }
            
            if (isCycleEdge) {
                edge.color = { color: COLORS.CIRCULAR_EDGE };
                edge.width = COLORS.SIZING.EDGE_WIDTH_PATH;
            } else {
                edge.color = COLORS.NORMAL_EDGE;
                edge.width = COLORS.SIZING.EDGE_WIDTH;
            }
        }
    }
    // FINAL GRAPH CREATION - USE HELPER FUNCTIONS
    createOrUpdateGraph(container, nodes, edges, couleur, circular);

    if (!circular && results && results.paths.length > 0) {
        colorierChemin(0);
    }
    return classification;
}


fileBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener('change', function (e) {
    const input = e.target;
    const file = input.files[0];
    if (!file) {
        input.value = "";
        return;
    }

    lastUploadedFileName = file.name;
    fileName.textContent = lastUploadedFileName;

    file.text().then(text => {
        loadedTextFromFile = text.trim();
        document.getElementById('codeBrutInput').value = loadedTextFromFile;
        appliquerParametres();
        input.value = "";
    });
});

document.getElementById("codeBrutInput").addEventListener("input", () => {
    const textarea = document.getElementById("codeBrutInput");
    const current = textarea.value.trim();

    /* 1) Si la zone devient complètement vide → considérer qu’aucun fichier n’est chargé */
    if (current.length === 0) {
        lastUploadedFileName = null;
        loadedTextFromFile = "";
        fileName.innerHTML = `<span style="color:#555">No file selected</span>`;
        return;
    }

    /* 2) Si aucun fichier n’a jamais été chargé → afficher “No file selected” */
    if (!lastUploadedFileName) {
        fileName.innerHTML = `<span style="color:#555">No file selected</span>`;
        return;
    }

    /* 3) Si un fichier a été chargé, vérifier s’il a été modifié */
    if (current === loadedTextFromFile) {
        /* Le texte correspond à celui du fichier original */
        fileName.innerHTML = `<span style="color:#555">${lastUploadedFileName}</span>`;
    } else {
        /*  Le texte a été modifié — l’afficher en orange */
        fileName.innerHTML =
            `<span style="color:orange; font-weight:600;">Modified:</span> ` +
            `<span style="color:#222;">${lastUploadedFileName}</span>`;

    }
});

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    document.querySelectorAll('.graph-btn#full-screen').forEach(btn => {
        const wrapper = btn.closest('.mb-6');
        
        if (wrapper === fullscreenElement) {
            btn.textContent = 'Quit Fullscreen';
        } else {
            btn.textContent = 'Full Screen';
        }
    });
    if (fullscreenElement && fullscreenElement.querySelector('.vis-network')) {
        const networkContainer = fullscreenElement.querySelector('.vis-network').parentElement;
        
        if (networkContainer && networkContainer.visNetwork) {
            networkContainer.style.height = '99vh';
            setTimeout(() => {
                const actualHeight = networkContainer.clientHeight;
                networkContainer.style.height = '99vh';

                networkContainer.visNetwork.redraw();
                networkContainer.visNetwork.fit(); 
            }, 50); 
        }
    } else {
        document.querySelectorAll('#graph-list [id^="graph-"]').forEach(container => {
             // Vérifier si le conteneur a un objet Vis.js attaché
             if (container.visNetwork) {
                // Remettre la hauteur par défaut
                container.style.height = '500px'; // Utiliser 500px comme valeur par défaut

                setTimeout(() => {
                    container.visNetwork.redraw();
                    container.visNetwork.fit(); 
                }, 50); 
             }
        });
        
    }
}

window.onload = appliquerParametres;