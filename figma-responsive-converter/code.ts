// PC to Mobile Converter - Figma Plugin
// 반응형 변환 규칙 적용

// Breakpoints
const BREAKPOINTS = {
  mobile: { min: 360, max: 819, padding: 16 },
  tablet: { min: 820, max: 1023, padding: 16 },
  pc: { min: 1024, max: null, padding: 24, maxContent: 1200 }
};

// 기준 모바일 너비
const MOBILE_WIDTH = 375;

// Stack 디자인 시스템 텍스트 스타일 Key (라이브러리 스타일)
const STYLE_KEYS: Record<string, string> = {
  'heroTitle': '32b30df26b13168efe601419ea56c413d6668478',
  'largeTitle': '4b3bd4c2960ceb679c5e3e2d37340d082e45448f',
  'title1': '6d573fd2e7392e7190996a233bd20f1b080b533a',
  'title2': 'f6addf813eeb5cda16faa300fb18697926b32cdc',
  'subTitle1': 'ef6d1719025b8087ae1d62eec1b48a7b94e6608c',
  'subTitle2': '15a585d082e777f49255f3e94e2bec2103caa60a',
  'subTitle3': 'a2cddc8d9244746d046f38410ba573ecddf5cc63',
  'bodyM': 'b63b5c2d8c24f07359b4e5e2c472839d34787196',
  'bodyB': 'b0bd9399c92c8d53a3fe492bab0398a199670460',
  'bodyLong': '55a83c7b81a8f00f2f96ef7a420ec4f4338056bb',
  'bodyCompact': '5e75a0087e491b6775607a86857b5239295ad8e3',
  'captionSb': '8f29f98aeae41517f932e62c20d8b4004c91664c',
  'captionM': '47b2c8c5106d9944107996824e6bc3abebc6911b',
  'tag1Sb': '34600ae4a70d7ee722611713ef5d88a621dc813c',
  'tag1M': '6d40e4a755943af0f31d46de05fe59c6edb10601',
  'tag2': '648c4654e1f1d8077b8319760629f5441622a221'
};

// PC → Mobile 변환 규칙 (숫자 1 → 2만 변환, 나머지 유지)
const STYLE_CONVERSION: Record<string, string> = {
  'title1': 'title2',
  'subTitle1': 'subTitle2'
};

// 메인 함수
figma.showUI(__html__, { width: 360, height: 520 });

figma.ui.onmessage = async (msg) => {
  // 스타일 Key 추출 (임시 기능)
  if (msg.type === 'extract-style-keys') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: '텍스트를 선택해주세요.'
        });
        return;
      }

      const textNode = selection[0];

      if (textNode.type !== 'TEXT') {
        figma.ui.postMessage({
          type: 'error',
          message: '텍스트 노드를 선택해주세요.'
        });
        return;
      }

      if (!textNode.textStyleId || typeof textNode.textStyleId !== 'string') {
        figma.ui.postMessage({
          type: 'error',
          message: '텍스트 스타일이 적용되지 않았습니다.'
        });
        return;
      }

      const style = await figma.getStyleByIdAsync(textNode.textStyleId);

      if (!style) {
        figma.ui.postMessage({
          type: 'error',
          message: '스타일을 찾을 수 없습니다.'
        });
        return;
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('스타일 이름:', style.name);
      console.log('스타일 Key:', style.key);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━');

      figma.ui.postMessage({
        type: 'success',
        message: `스타일 "${style.name}" Key 추출 완료! 콘솔을 확인하세요.`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      figma.ui.postMessage({
        type: 'error',
        message: `오류: ${errorMessage}`
      });
    }
  }

  if (msg.type === 'convert-to-mobile') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'PC 프레임을 선택해주세요.'
        });
        return;
      }

      const pcFrame = selection[0];

      if (pcFrame.type !== 'FRAME') {
        figma.ui.postMessage({
          type: 'error',
          message: '프레임을 선택해주세요.'
        });
        return;
      }

      // 모바일 프레임 생성
      const mobileFrame = await convertToMobile(pcFrame, msg.options);

      // 생성된 모바일 프레임 선택
      figma.currentPage.selection = [mobileFrame];
      figma.viewport.scrollAndZoomIntoView([mobileFrame]);

      figma.ui.postMessage({
        type: 'success',
        message: '모바일 프레임이 생성되었습니다!'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      figma.ui.postMessage({
        type: 'error',
        message: `오류: ${errorMessage}`
      });
    }
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// PC → Mobile 변환 메인 함수
async function convertToMobile(pcFrame: FrameNode, options: any): Promise<FrameNode> {
  const mobileWidth = options.mobileWidth || MOBILE_WIDTH;

  // 0. PC 프레임에 제약 조건 추가
  await addPCConstraints(pcFrame);

  // 1. 모바일 프레임 복제
  const mobileFrame = pcFrame.clone();
  mobileFrame.name = `${pcFrame.name} - Mobile`;

  // 2. 프레임 크기 조정
  mobileFrame.resize(mobileWidth, mobileFrame.height);

  // 3. 위치 조정 (PC 프레임 옆에 배치)
  mobileFrame.x = pcFrame.x + pcFrame.width + 100;
  mobileFrame.y = pcFrame.y;

  // 4. 패딩 변경 (24px → 16px)
  await updatePadding(mobileFrame, BREAKPOINTS.pc.padding, BREAKPOINTS.mobile.padding);

  // 5. GNB 변환
  await convertGNB(mobileFrame, options);

  // 6. 타이포그래피 변환
  await convertTypography(mobileFrame);

  // 7. 버튼 하단 고정 처리
  await fixButtonToBottom(mobileFrame, options);

  // 8. Footer 변환
  await convertFooter(mobileFrame, options);

  // 9. FAB 위치 조정
  await adjustFAB(mobileFrame);

  // 10. WebContainer maxWidth 설정
  await updateWebContainer(mobileFrame);

  // 11. 모바일 프레임에 maxWidth 제약 조건 추가
  await addMobileConstraints(mobileFrame);

  return mobileFrame;
}

// 패딩 업데이트
async function updatePadding(node: SceneNode, fromPadding: number, toPadding: number) {
  try {
    if ('paddingLeft' in node && 'paddingRight' in node) {
      if (node.paddingLeft === fromPadding) {
        node.paddingLeft = toPadding;
      }
      if (node.paddingRight === fromPadding) {
        node.paddingRight = toPadding;
      }
    }

    // 컴포넌트 인스턴스의 내부는 건너뛰기
    if (node.type === 'INSTANCE') {
      return;
    }

    // 자식 노드 재귀 처리
    if ('children' in node) {
      for (const child of node.children) {
        await updatePadding(child, fromPadding, toPadding);
      }
    }
  } catch (error) {
    // 접근 불가능한 노드는 건너뛰기
    console.log('updatePadding skip node:', node.name);
  }
}

// GNB 변환
async function convertGNB(frame: FrameNode, options: any) {
  // 정확한 GNB 노드 찾기 (GnbMenuItem 등 제외)
  const gnbNode = findNodeByExactName(frame, 'Gnb') ||
                  findNodeByExactName(frame, 'GNB') ||
                  findNodeByExactName(frame, 'gnb');

  if (!gnbNode) {
    console.log('GNB node not found');
    return;
  }

  console.log('GNB found:', gnbNode.name, 'type:', gnbNode.type);

  // 컴포넌트 인스턴스인 경우 State 프로퍼티 변경
  if (gnbNode.type === 'INSTANCE') {
    try {
      const instance = gnbNode as InstanceNode;
      console.log('GNB component properties:', instance.componentProperties);

      // 프로퍼티 이름 확인 (type 또는 State)
      const propertyNames = ['type', 'State'];
      // 컴포넌트는 type="PC" | "mobile" 형태
      const possibleValues = ['mobile', 'MO', 'Mobile', 'mo', 'M', 'm'];
      let success = false;

      for (const propName of propertyNames) {
        if (success) break;

        for (const value of possibleValues) {
          try {
            instance.setProperties({ [propName]: value });
            console.log(`GNB ${propName} changed to: ${value}`);
            success = true;
            break;
          } catch (e) {
            // 다음 값 시도
          }
        }
      }

      if (!success) {
        console.log('Failed to change GNB property. Available properties:', Object.keys(instance.componentProperties || {}));
      }

      // 반응형 FILL 설정
      if ('layoutSizingHorizontal' in instance) {
        instance.layoutSizingHorizontal = 'FILL';
        console.log('GNB horizontal sizing set to FILL');
      }
    } catch (error) {
      console.log('GNB setProperties error:', error);
    }
  }

  // Frame인 경우 수동 변경
  if (gnbNode.type === 'FRAME') {
    // 높이 변경: 60px → 50px
    if (gnbNode.height === 60) {
      gnbNode.resize(gnbNode.width, 50);
    }

    // Container 찾기
    const container = findNodeByName(gnbNode, 'Container');
    if (container && 'paddingLeft' in container) {
      container.paddingLeft = 16;
      container.paddingRight = 16;
    }

    // 메뉴 항목 숨기기
    const menuItems = findNodeByName(gnbNode, 'Items') || findNodeByName(gnbNode, 'menu');
    if (menuItems) {
      menuItems.visible = false;
    }

    // 로그인 버튼 숨기기
    const loginButton = findNodeByName(gnbNode, 'login') || findNodeByName(gnbNode, 'login+mypage');
    if (loginButton) {
      loginButton.visible = false;
    }

    // 햄버거 아이콘 표시 (이미 있다면)
    const hamburger = findNodeByName(gnbNode, 'hamburger') || findNodeByName(gnbNode, 'menu-icon');
    if (hamburger) {
      hamburger.visible = true;
    }
  }
}

// 타이포그래피 변환
async function convertTypography(node: SceneNode) {
  try {
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;

      // 현재 텍스트 스타일 확인
      if (textNode.textStyleId && typeof textNode.textStyleId === 'string') {
        const currentStyle = await figma.getStyleByIdAsync(textNode.textStyleId);

        if (currentStyle) {
          const styleName = currentStyle.name;

          // 변환 규칙 확인 (title1 → title2, subTitle1 → subTitle2)
          const targetStyleName = STYLE_CONVERSION[styleName];

          if (targetStyleName) {
            // 변환할 스타일이 있음
            const targetStyleKey = STYLE_KEYS[targetStyleName];

            if (targetStyleKey) {
              try {
                // 라이브러리 스타일 import
                const targetStyle = await figma.importStyleByKeyAsync(targetStyleKey);

                // 스타일 적용 (비동기)
                await textNode.setTextStyleIdAsync(targetStyle.id);

                console.log(`✅ Typography changed via style: ${styleName} → ${targetStyleName}`);
              } catch (error) {
                console.log(`❌ Failed to import style ${targetStyleName}:`, error);
              }
            } else {
              console.log(`⚠️ Style key not found for: ${targetStyleName}`);
            }
          }
          // 변환 규칙에 없으면 그대로 유지 (나머지 스타일들)
        }
      }
      // 텍스트 스타일이 없는 경우는 그대로 유지
    }

    // 컴포넌트 인스턴스의 내부는 건너뛰기
    if (node.type === 'INSTANCE') {
      return;
    }

    // 재귀 처리
    if ('children' in node) {
      for (const child of node.children) {
        await convertTypography(child);
      }
    }
  } catch (error) {
    // 접근 불가능한 노드는 건너뛰기
    console.log('convertTypography skip node:', node.name);
  }
}

// 버튼 하단 고정
async function fixButtonToBottom(frame: FrameNode, options: any) {
  // "다음" 버튼 찾기
  const nextButton = findNodeContainingText(frame, '다음');

  if (!nextButton) return;

  // 버튼이 lg 사이즈 이상인지 확인 (52px 이상)
  if (nextButton.height < 52) return;

  // 화면에 lg 이상 버튼이 1개인지 확인
  const largeButtons = findLargeButtons(frame);
  if (largeButtons.length !== 1) return;

  // 헤더에서 버튼 제거
  const header = findNodeByName(frame, 'header') || findNodeByName(frame, 'Header');
  if (header && nextButton.parent === header) {
    nextButton.remove();
  }

  // 하단 고정 버튼 래퍼 생성
  const buttonWrapper = figma.createFrame();
  buttonWrapper.name = 'FixedButtonWrapper';
  buttonWrapper.resize(frame.width, 72);
  buttonWrapper.x = 0;
  buttonWrapper.y = frame.height - 72;

  // Auto layout 설정
  buttonWrapper.layoutMode = 'VERTICAL';
  buttonWrapper.paddingLeft = 16;
  buttonWrapper.paddingRight = 16;
  buttonWrapper.paddingTop = 10;
  buttonWrapper.paddingBottom = 10;
  buttonWrapper.primaryAxisSizingMode = 'FIXED';
  buttonWrapper.counterAxisSizingMode = 'FIXED';

  // 배경 및 테두리
  buttonWrapper.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  buttonWrapper.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.9 } }];
  buttonWrapper.strokeWeight = 1;
  buttonWrapper.strokeAlign = 'INSIDE';

  // 버튼 복제 및 추가
  const clonedButton = nextButton.clone();
  if ('layoutSizingHorizontal' in clonedButton) {
    clonedButton.layoutSizingHorizontal = 'FILL';
  }
  buttonWrapper.appendChild(clonedButton);

  // 프레임에 추가
  frame.appendChild(buttonWrapper);

  // 콘텐츠 여백 추가
  const mainContent = findNodeByName(frame, 'Contents') || findNodeByName(frame, 'MainContent');
  if (mainContent && 'paddingBottom' in mainContent) {
    mainContent.paddingBottom = 92;
  }
}

// Footer 변환
async function convertFooter(frame: FrameNode, options: any) {
  const footer = findNodeByName(frame, 'Footer') || findNodeByName(frame, 'FooterPc');

  if (!footer) {
    console.log('Footer node not found');
    return;
  }

  console.log('Footer found:', footer.name, 'type:', footer.type);

  // 컴포넌트 인스턴스인 경우 State 프로퍼티 변경
  if (footer.type === 'INSTANCE') {
    try {
      const instance = footer as InstanceNode;
      console.log('Footer component properties:', instance.componentProperties);

      // 프로퍼티 이름 확인 (type 또는 State)
      const propertyNames = ['type', 'State'];
      // 컴포넌트는 type="PC" | "mobile" 형태
      const possibleValues = ['mobile', 'MO', 'Mobile', 'mo', 'M', 'm'];
      let success = false;

      for (const propName of propertyNames) {
        if (success) break;

        for (const value of possibleValues) {
          try {
            instance.setProperties({ [propName]: value });
            console.log(`Footer ${propName} changed to: ${value}`);
            success = true;
            break;
          } catch (e) {
            // 다음 값 시도
          }
        }
      }

      if (!success) {
        console.log('Failed to change Footer property. Available properties:', Object.keys(instance.componentProperties || {}));
      }

      // 반응형 FILL 설정
      if ('layoutSizingHorizontal' in instance) {
        instance.layoutSizingHorizontal = 'FILL';
        console.log('Footer horizontal sizing set to FILL');
      }
    } catch (error) {
      console.log('Footer setProperties error:', error);
    }
  }

  // Frame인 경우 수동 변경
  if ('paddingLeft' in footer) {
    footer.paddingLeft = 16;
    footer.paddingRight = 16;
    footer.paddingTop = 20;
    footer.paddingBottom = 20;

    // 복잡한 컬럼 레이아웃 숨기기
    if ('children' in footer) {
      const columns = findNodeByName(footer as FrameNode, 'FooterColumns');
      if (columns) {
        columns.visible = false;
      }

      // 고객센터 상세 정보 숨기기
      const customerService = findNodeByName(footer as FrameNode, '고객센터');
      if (customerService && customerService.parent && 'children' in customerService.parent) {
        for (const child of customerService.parent.children) {
          if (child !== customerService && child.type === 'TEXT') {
            child.visible = false;
          }
        }
      }
    }
  }
}

// FAB 위치 조정
async function adjustFAB(frame: FrameNode) {
  const fab = findNodeByName(frame, 'FAB');

  if (!fab) return;

  // 위치 조정
  fab.x = frame.width - 52 - 16; // right: 16px
  fab.y = frame.height - 72 - 52 - 10; // bottom: 92px (버튼 위)
}

// WebContainer maxWidth 업데이트
async function updateWebContainer(frame: FrameNode) {
  const webContainer = findNodeByName(frame, 'WebContainer');

  if (!webContainer || webContainer.type !== 'FRAME') return;

  // PC: maxWidth 1200px → Mobile: 제약 제거
  // Auto layout으로 설정되어 있으면 primaryAxisSizingMode를 변경
  if ('primaryAxisSizingMode' in webContainer) {
    webContainer.primaryAxisSizingMode = 'AUTO';
  }

  // maxWidth 제약 제거
  if ('constraints' in webContainer) {
    webContainer.layoutAlign = 'STRETCH';
  }

  console.log('WebContainer constraints updated for mobile');
}

// PC 프레임 제약 조건 추가
async function addPCConstraints(frame: FrameNode) {
  // 프레임 이름에 minWidth 정보 추가 (메타데이터로)
  const originalName = frame.name;
  if (!originalName.includes('minWidth:1024')) {
    frame.name = `${originalName} (minWidth:1024)`;
  }

  // 실제 minWidth 제약 조건 적용 (Auto Layout인 경우)
  if ('layoutMode' in frame && frame.layoutMode !== 'NONE') {
    if ('minWidth' in frame) {
      frame.minWidth = 1024;
    }
  }

  // WebContainer에 maxWidth 1200 설정
  const webContainer = findNodeByName(frame, 'WebContainer');
  if (webContainer && webContainer.type === 'FRAME') {
    // 프레임 이름에 maxWidth 추가
    if (!webContainer.name.includes('maxWidth:1200')) {
      webContainer.name = `${webContainer.name} (maxWidth:1200)`;
    }

    // 실제 maxWidth 제약 조건 적용 (Auto Layout인 경우)
    const webContainerFrame = webContainer as FrameNode;
    if ('layoutMode' in webContainerFrame && webContainerFrame.layoutMode !== 'NONE') {
      if ('maxWidth' in webContainerFrame) {
        webContainerFrame.maxWidth = 1200;
      }
    }
  }

  console.log('PC frame constraints added: minWidth 1024px, WebContainer maxWidth 1200px');
}

// 모바일 프레임 제약 조건 추가
async function addMobileConstraints(frame: FrameNode) {
  // 프레임 이름에 maxWidth 정보 추가 (메타데이터로)
  const originalName = frame.name;
  if (!originalName.includes('maxWidth:1023')) {
    frame.name = `${originalName} (maxWidth:1023)`;
  }

  // 실제 maxWidth 제약 조건 적용 (Auto Layout인 경우)
  if ('layoutMode' in frame && frame.layoutMode !== 'NONE') {
    if ('maxWidth' in frame) {
      frame.maxWidth = 1023;
    }
  }

  console.log('Mobile frame constraints added: maxWidth 1023px');
}

// 유틸리티 함수들
function findNodeByName(parent: BaseNode & ChildrenMixin, name: string): SceneNode | null {
  try {
    for (const child of parent.children) {
      try {
        if (child.name.includes(name)) {
          return child;
        }
      } catch (e) {
        // 노드 이름 접근 불가 시 건너뛰기
        continue;
      }
      if ('children' in child) {
        const found = findNodeByName(child, name);
        if (found) return found;
      }
    }
  } catch (error) {
    // 접근 불가능한 노드는 건너뛰기
  }
  return null;
}

// 정확한 이름으로 노드 찾기 (부분 일치 아님)
function findNodeByExactName(parent: BaseNode & ChildrenMixin, name: string): SceneNode | null {
  try {
    for (const child of parent.children) {
      try {
        if (child.name === name) {
          return child;
        }
      } catch (e) {
        // 노드 이름 접근 불가 시 건너뛰기
        continue;
      }
      if ('children' in child) {
        const found = findNodeByExactName(child, name);
        if (found) return found;
      }
    }
  } catch (error) {
    // 접근 불가능한 노드는 건너뛰기
  }
  return null;
}

function findNodeContainingText(parent: BaseNode & ChildrenMixin, text: string): SceneNode | null {
  for (const child of parent.children) {
    if (child.type === 'TEXT') {
      const textNode = child as TextNode;
      if (textNode.characters.includes(text)) {
        return child;
      }
    }
    if ('children' in child) {
      const found = findNodeContainingText(child, text);
      if (found) return found;
    }
  }
  return null;
}

function findLargeButtons(parent: BaseNode & ChildrenMixin): SceneNode[] {
  const buttons: SceneNode[] = [];

  function traverse(node: BaseNode) {
    if ('children' in node) {
      for (const child of node.children) {
        // 버튼으로 추정되는 노드 찾기 (높이 >= 52px)
        if ('height' in child && child.height >= 52 &&
            (child.name.includes('Button') || child.name.includes('button'))) {
          buttons.push(child);
        }
        traverse(child);
      }
    }
  }

  traverse(parent);
  return buttons;
}
