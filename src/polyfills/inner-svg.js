(function() {
  /* istanbul ignore next */
  if (window.SVGElement) {
    var serializeXML = function(node, output) {
      const nodeType = node.nodeType
      if (nodeType == 3) {
        // TEXT nodes.
        // Replace special XML characters with their entities.
        output.push(
          node.textContent
            .replace(/&/, "&amp;")
            .replace(/</, "&lt;")
            .replace(">", "&gt;")
        )
      } else if (nodeType == 1) {
        // ELEMENT nodes.
        // Serialize Element nodes.
        output.push("<", node.tagName)
        if (node.hasAttributes()) {
          const attrMap = node.attributes
          for (var i = 0, len = attrMap.length; i < len; ++i) {
            const attrNode = attrMap.item(i)
            output.push(" ", attrNode.name, "='", attrNode.value, "'")
          }
        }
        if (node.hasChildNodes()) {
          output.push(">")
          const childNodes = node.childNodes
          for (var i = 0, len = childNodes.length; i < len; ++i) {
            serializeXML(childNodes.item(i), output)
          }
          output.push("</", node.tagName, ">")
        } else {
          output.push("/>")
        }
      } else if (nodeType == 8) {
        // TODO(codedread): Replace special characters with XML entities?
        output.push("<!--", node.nodeValue, "-->")
      } else {
        // TODO: Handle CDATA nodes.
        // TODO: Handle ENTITY nodes.
        // TODO: Handle DOCUMENT nodes.
        throw "Error serializing XML. Unhandled node of type: " + nodeType
      }
    }
    // The innerHTML DOM property for SVGElement.
    Object.defineProperty(window.SVGElement.prototype, "innerHTML", {
      get() {
        const output = []
        let childNode = this.firstChild
        while (childNode) {
          serializeXML(childNode, output)
          childNode = childNode.nextSibling
        }
        return output.join("")
      },
      set(markupText) {
        // Wipe out the current contents of the element.
        while (this.firstChild) {
          this.removeChild(this.firstChild)
        }

        try {
          // Parse the markup into valid nodes.
          // var dXML = new DOMParser();
          // dXML.async = false;
          // Wrap the markup into a SVG node to ensure parsing works.
          markupText =
            "<svg xmlns='http://www.w3.org/2000/svg'>" + markupText + "</svg>"

          const divContainer = document.createElement("div")
          divContainer.innerHTML = markupText
          const svgDocElement = divContainer.querySelector("svg")
          // Now take each node, import it and append to this element.
          let childNode = svgDocElement.firstChild
          while (childNode) {
            this.appendChild(this.ownerDocument.importNode(childNode, true))
            childNode = childNode.nextSibling
          }
        } catch (e) {
          throw e
        }
      }
    })

    // The innerSVG DOM property for SVGElement.
    Object.defineProperty(window.SVGElement.prototype, "innerSVG", {
      get() {
        return this.innerHTML
      },
      set(markupText) {
        this.innerHTML = markupText
      }
    })
  }
})()
