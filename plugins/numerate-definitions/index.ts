import * as fs from 'fs';
import * as cheerio from 'cheerio';
import { Plugin, LoadContext } from '@docusaurus/types';

export interface HtmlFile {
  route: string;
  html: string;
}

export interface SvgFile {
  route: string;
  svg: cheerio.Cheerio<cheerio.Element>;
  htmlIndex: number;
}

export default function numerateDefinitions(
  context: LoadContext,
): Plugin {
  return {
    name: 'numerate-definitions',
    async postBuild(props) {
      let sidebar = require(`${props.siteDir}/sidebars.js`);
      let sidebarItems = sidebar.tutorialSidebar;
      let sidebarRoutes: string[] = [];
      for (let item of sidebarItems) {
        if (item.type === 'doc') {
          sidebarRoutes.push(item.id);
        } else if (item.type === 'category') {
          sidebarRoutes.push(item.link.id);
          for (let subItem of item.items) {
            sidebarRoutes.push(subItem.id);
          }
        }
      }
  
      let htmlFilesToFix: HtmlFile[] = [];

      for (const route of sidebarRoutes) {
        const filePath = `${props.outDir}/${route}/index.html`;
        const html = fs.readFileSync(filePath, 'utf8');
  
        if (html.includes('-def-num-')) {
          let htmlFile: HtmlFile = { route: route, html };
          htmlFilesToFix.push(htmlFile);
        }
      }

      let definitionsMap = [];
      let defCounter = 1;
      
      for (let htmlFile of htmlFilesToFix) {
        let $ = cheerio.load(htmlFile.html);
        // find h6 which text include -def-num-, and replace -def-num- with the counter
        let h6s = $('h6');
        for (let h6 of h6s) {
          let h6Text = $(h6).text();
          if (h6Text.includes('-def-num-')) {
            let id = $(h6).attr('id');
            definitionsMap[id] = defCounter;
            let newH6Text = h6Text.replace('-def-num-', defCounter.toString()+".");
            $(h6).text(newH6Text);
            defCounter++;
          }
        }
        htmlFile.html = $.html();
      }

      for (let htmlFile of htmlFilesToFix) {
        let $ = cheerio.load(htmlFile.html);
        // find a which text include -def-num-ref-, and replace -def-num-ref- with the correct definition number
        let a = $('a');
        for (let aItem of a) {
          let aText = $(aItem).text();
          if (aText.includes('-def-num-ref-')) {
            let href = $(aItem).attr('href');
            let defId = href.split('#')[1];
            let defNumber = definitionsMap[defId];
            let newAText = aText.replace('-def-num-ref-', defNumber);
            $(aItem).text(newAText);
          }
        }
        fs.writeFileSync(`${props.outDir}/${htmlFile.route}/index.html`, $.html());
      }

    },
  }
};
