"use strict";
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
// 타이포그래피 매핑
const TYPOGRAPHY_MAP = {
    // title1 (28px) → title2 (22px)
    'title1': { from: 28, to: 22, fromLineHeight: 38, toLineHeight: 30 },
    // bodyB (15px/Bold) → captionM (13px/Medium)
    'bodyB': { from: 15, to: 13, fromWeight: 700, toWeight: 500 },
    // 유지
    'subTitle3': { from: 16, to: 16 },
    'bodyM': { from: 15, to: 15 },
    'captionM': { from: 13, to: 13 },
    'tag1Sb': { from: 12, to: 12 },
    'tag1M': { from: 12, to: 12 },
    'tag2': { from: 11, to: 11 }
};
// 메인 함수
figma.showUI(__html__, { width: 360, height: 520 });
figma.ui.onmessage = async (msg) => {
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
        }
        catch (error) {
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
async function convertToMobile(pcFrame, options) {
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
async function updatePadding(node, fromPadding, toPadding) {
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
    }
    catch (error) {
        // 접근 불가능한 노드는 건너뛰기
        console.log('updatePadding skip node:', node.name);
    }
}
// GNB 변환
async function convertGNB(frame, options) {
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
            const instance = gnbNode;
            console.log('GNB component properties:', instance.componentProperties);
            // 프로퍼티 이름 확인 (type 또는 State)
            const propertyNames = ['type', 'State'];
            // 컴포넌트는 type="PC" | "mobile" 형태
            const possibleValues = ['mobile', 'MO', 'Mobile', 'mo', 'M', 'm'];
            let success = false;
            for (const propName of propertyNames) {
                if (success)
                    break;
                for (const value of possibleValues) {
                    try {
                        instance.setProperties({ [propName]: value });
                        console.log(`GNB ${propName} changed to: ${value}`);
                        success = true;
                        break;
                    }
                    catch (e) {
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
        }
        catch (error) {
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
async function convertTypography(node) {
    try {
        if (node.type === 'TEXT') {
            const textNode = node;
            // 현재 텍스트 스타일 확인
            if (textNode.textStyleId && typeof textNode.textStyleId === 'string') {
                const currentStyle = await figma.getStyleByIdAsync(textNode.textStyleId);
                if (currentStyle) {
                    const styleName = currentStyle.name;
                    // 변환 매핑
                    const styleMap = {
                        'title1': 'title2',
                        'bodyB': 'captionM'
                    };
                    // 스타일 이름에서 변환할 스타일 찾기
                    for (const [fromStyle, toStyle] of Object.entries(styleMap)) {
                        if (styleName.includes(fromStyle)) {
                            // 새로운 스타일 찾기
                            const allStyles = await figma.getLocalTextStylesAsync();
                            const newStyle = allStyles.find(style => style.name.includes(toStyle));
                            if (newStyle) {
                                // 폰트 로드
                                const styleNode = textNode.clone();
                                styleNode.textStyleId = newStyle.id;
                                await figma.loadFontAsync(styleNode.fontName);
                                styleNode.remove();
                                // 스타일 적용
                                textNode.textStyleId = newStyle.id;
                                console.log(`Typography changed: ${fromStyle} → ${toStyle}`);
                            }
                            break;
                        }
                    }
                }
            }
            // 텍스트 스타일이 없는 경우 폰트 사이즈 기반 변환 (fallback)
            else {
                await figma.loadFontAsync(textNode.fontName);
                const fontSize = textNode.fontSize;
                const fontWeight = textNode.fontName.style;
                // title1 (28px) → title2 (22px)
                if (fontSize === 28 && fontWeight.includes('Bold')) {
                    const allStyles = await figma.getLocalTextStylesAsync();
                    const title2Style = allStyles.find(style => style.name.includes('title2'));
                    if (title2Style) {
                        const styleNode = textNode.clone();
                        styleNode.textStyleId = title2Style.id;
                        await figma.loadFontAsync(styleNode.fontName);
                        styleNode.remove();
                        textNode.textStyleId = title2Style.id;
                    }
                }
                // bodyB (15px/Bold) → captionM (13px/Medium)
                else if (fontSize === 15 && fontWeight.includes('Bold')) {
                    const allStyles = await figma.getLocalTextStylesAsync();
                    const captionMStyle = allStyles.find(style => style.name.includes('captionM'));
                    if (captionMStyle) {
                        const styleNode = textNode.clone();
                        styleNode.textStyleId = captionMStyle.id;
                        await figma.loadFontAsync(styleNode.fontName);
                        styleNode.remove();
                        textNode.textStyleId = captionMStyle.id;
                    }
                }
            }
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
    }
    catch (error) {
        // 접근 불가능한 노드는 건너뛰기
        console.log('convertTypography skip node:', node.name);
    }
}
// 버튼 하단 고정
async function fixButtonToBottom(frame, options) {
    // "다음" 버튼 찾기
    const nextButton = findNodeContainingText(frame, '다음');
    if (!nextButton)
        return;
    // 버튼이 lg 사이즈 이상인지 확인 (52px 이상)
    if (nextButton.height < 52)
        return;
    // 화면에 lg 이상 버튼이 1개인지 확인
    const largeButtons = findLargeButtons(frame);
    if (largeButtons.length !== 1)
        return;
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
async function convertFooter(frame, options) {
    const footer = findNodeByName(frame, 'Footer') || findNodeByName(frame, 'FooterPc');
    if (!footer) {
        console.log('Footer node not found');
        return;
    }
    console.log('Footer found:', footer.name, 'type:', footer.type);
    // 컴포넌트 인스턴스인 경우 State 프로퍼티 변경
    if (footer.type === 'INSTANCE') {
        try {
            const instance = footer;
            console.log('Footer component properties:', instance.componentProperties);
            // 프로퍼티 이름 확인 (type 또는 State)
            const propertyNames = ['type', 'State'];
            // 컴포넌트는 type="PC" | "mobile" 형태
            const possibleValues = ['mobile', 'MO', 'Mobile', 'mo', 'M', 'm'];
            let success = false;
            for (const propName of propertyNames) {
                if (success)
                    break;
                for (const value of possibleValues) {
                    try {
                        instance.setProperties({ [propName]: value });
                        console.log(`Footer ${propName} changed to: ${value}`);
                        success = true;
                        break;
                    }
                    catch (e) {
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
        }
        catch (error) {
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
            const columns = findNodeByName(footer, 'FooterColumns');
            if (columns) {
                columns.visible = false;
            }
            // 고객센터 상세 정보 숨기기
            const customerService = findNodeByName(footer, '고객센터');
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
async function adjustFAB(frame) {
    const fab = findNodeByName(frame, 'FAB');
    if (!fab)
        return;
    // 위치 조정
    fab.x = frame.width - 52 - 16; // right: 16px
    fab.y = frame.height - 72 - 52 - 10; // bottom: 92px (버튼 위)
}
// WebContainer maxWidth 업데이트
async function updateWebContainer(frame) {
    const webContainer = findNodeByName(frame, 'WebContainer');
    if (!webContainer || webContainer.type !== 'FRAME')
        return;
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
async function addPCConstraints(frame) {
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
        const webContainerFrame = webContainer;
        if ('layoutMode' in webContainerFrame && webContainerFrame.layoutMode !== 'NONE') {
            if ('maxWidth' in webContainerFrame) {
                webContainerFrame.maxWidth = 1200;
            }
        }
    }
    console.log('PC frame constraints added: minWidth 1024px, WebContainer maxWidth 1200px');
}
// 모바일 프레임 제약 조건 추가
async function addMobileConstraints(frame) {
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
function findNodeByName(parent, name) {
    for (const child of parent.children) {
        if (child.name.includes(name)) {
            return child;
        }
        if ('children' in child) {
            const found = findNodeByName(child, name);
            if (found)
                return found;
        }
    }
    return null;
}
// 정확한 이름으로 노드 찾기 (부분 일치 아님)
function findNodeByExactName(parent, name) {
    for (const child of parent.children) {
        if (child.name === name) {
            return child;
        }
        if ('children' in child) {
            const found = findNodeByExactName(child, name);
            if (found)
                return found;
        }
    }
    return null;
}
function findNodeContainingText(parent, text) {
    for (const child of parent.children) {
        if (child.type === 'TEXT') {
            const textNode = child;
            if (textNode.characters.includes(text)) {
                return child;
            }
        }
        if ('children' in child) {
            const found = findNodeContainingText(child, text);
            if (found)
                return found;
        }
    }
    return null;
}
function findLargeButtons(parent) {
    const buttons = [];
    function traverse(node) {
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
