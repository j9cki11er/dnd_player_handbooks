import sys
import re
from bs4 import BeautifulSoup

def extract_spells(file_path):
    # D&D docs are often GBK/GB2312. GB18030 is the safest superset.
    try:
        with open(file_path, 'r', encoding='gb18030') as f:
            html_content = f.read()
    except Exception:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    spells = []
    
    h4s = soup.find_all('h4')
    for i, h4 in enumerate(h4s):
        name = h4.get_text(strip=True).replace('｜', ' | ')
        
        # Find all content until next h4
        content_nodes = []
        curr = h4.next_sibling
        next_h4 = h4s[i+1] if i+1 < len(h4s) else None
        
        while curr and curr != next_h4:
            content_nodes.append(curr)
            curr = curr.next_sibling
            
        casting_time = ""
        range_val = ""
        components = ""
        duration = ""
        info_line = ""
        
        description_parts = []
        meta_labels = ["施法时间", "施法距离", "法术成分", "持续时间"]
        
        for node in content_nodes:
            if node.name == 'p':
                # Check for info_line (EM)
                em = node.find('em')
                if em and not info_line:
                    info_line = em.get_text(strip=True)
                
                # Extract meta values first
                strongs = node.find_all('strong')
                for strong in strongs:
                    label = strong.get_text(strip=True)
                    text = ""
                    nxt = strong.next_sibling
                    while nxt and nxt.name != 'strong' and nxt.name != 'br':
                        if isinstance(nxt, str): text += nxt
                        else: text += nxt.get_text()
                        nxt = nxt.next_sibling
                    
                    text = " ".join(text.split())
                    if "施法时间" in label: casting_time = text
                    elif "施法距离" in label: range_val = text
                    elif "法术成分" in label: components = text
                    elif "持续时间" in label: duration = text

                # Cleanly extract description from this paragraph
                last_meta_strong = None
                for strong in node.find_all('strong'):
                    if any(ml in strong.get_text() for ml in meta_labels):
                        last_meta_strong = strong
                
                if last_meta_strong:
                    curr_child = last_meta_strong.next_sibling
                    # Skip the text value of the last metadata and any following BR
                    while curr_child:
                        if curr_child.name == 'br':
                            curr_child = curr_child.next_sibling
                            break
                        if isinstance(curr_child, str) and (curr_child.strip() in [casting_time, range_val, components, duration, ""]):
                            curr_child = curr_child.next_sibling
                            continue
                        break
                    
                    while curr_child:
                        if isinstance(curr_child, str):
                            description_parts.append(curr_child.strip())
                        else:
                            description_parts.append(curr_child.get_text(strip=True))
                        curr_child = curr_child.next_sibling
                else:
                    # No metadata strongs here, might be a continuation paragraph
                    # Avoid adding the info_line again
                    p_text = node.get_text(strip=True)
                    if p_text and p_text != info_line:
                        description_parts.append(p_text)
            
            elif node.name in ['div', 'ul', 'ol', 'blockquote', 'table']:
                # The user wants everything in one paragraph, so we strip newlines
                description_parts.append(node.get_text(separator=" ").strip())

        # Join everything into a single paragraph
        # Clean up double spaces or weird artifacts
        description = " ".join([p for p in description_parts if p]).strip()
        description = re.sub(r'\s+', ' ', description)
        # Specifically handle the user's example style if needed, but simple join usually works.
        # Ensure '。' is handled well if we want it to look like a single block.

        spells.append({
            "name": name,
            "info": info_line,
            "casting_time": casting_time,
            "range": range_val,
            "components": components,
            "duration": duration,
            "description": description
        })
    
    return spells

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_spells.py <file_path>")
        sys.exit(1)
        
    spells = extract_spells(sys.argv[1])
    for s in spells:
        print(f"**{s['name']}** {s['info']}")
        print(f"施法时间：{s['casting_time']}    施法距离：{s['range']}    法术成分：{s['components']}    持续时间：{s['duration']}")
        print(f"{s['description']}")
        print("\n" + "-"*30 + "\n")
