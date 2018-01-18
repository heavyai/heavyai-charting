(function() {
  /* istanbul ignore next */
  if (window.SVGElement) {
    var serializeXML = function(node, output) {
      const nodeType = node.nodeType;
      if (nodeType == 3) {
        // TEXT nodes.
        // Replace special XML characters with their entities.
        output.push(
          node.textContent
            .replace(/&/, '&amp;')
            .replace(/</, '&lt;')
            .replace('>', '&gt;')
        );
      } else if (nodeType == 1) {
        // ELEMENT nodes.
        // Serialize Element nodes.
        output.push('<', node.tagName);
        if (node.hasAttributes()) {
          const attrMap = node.attributes;
          for (var i = 0, len = attrMap.length; i < len; ++i) {
            const attrNode = attrMap.item(i);
            output.push(' ', attrNode.name, "='", attrNode.value, "'");
          }
        }
        if (node.hasChildNodes()) {
          output.push('>');
          const childNodes = node.childNodes;
          for (var i = 0, len = childNodes.length; i < len; ++i) {
            serializeXML(childNodes.item(i), output);
          }
          output.push('</', node.tagName, '>');
        } else {
          output.push('/>');
        }
      } else if (nodeType == 8) {
        // TODO(codedread): Replace special characters with XML entities?
        output.push('<!--', node.nodeValue, '-->');
      } else {
        // TODO: Handle CDATA nodes.
        // TODO: Handle ENTITY nodes.
        // TODO: Handle DOCUMENT nodes.
        throw 'Error serializing XML. Unhandled node of type: ' + nodeType;
      }
    };
    // The innerHTML DOM property for SVGElement.
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      function () {
        if (this.node.style.display == 'none') {
          this.show();
          var hide = true;
        }
        var bbox = {};
        try {
          bbox = this.node.getBBox();
        } catch (e) {
          // Firefox 3.0.x plays badly here
        } finally {
          bbox = bbox || {};
        }
        hide && this.hide();
        return bbox;
      }
    });
  }
})();
